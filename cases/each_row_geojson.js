import fs from "fs-extra";
const geojson = fs.readJsonSync("./tatebayashi_stones.geojson");

export async function each_row_geojson(connection) {
  console.log("## Result of geojson case (Each rows)");
  // Create Table
  // For insert GeoJSON records
  await connection.query(`CREATE TABLE each_row_geojson(
    id INT NOT NULL,
    geojson JSON,
    latlong GEOMETRY AS (ST_GeomFromGeoJSON(geojson, 1, 4326)) STORED NOT NULL SRID 4326,
    PRIMARY KEY (id),
    SPATIAL INDEX sp_index1 (latlong)
  );`);

  // Insert GeoJson's each record
  console.log(`Total number of features: ${geojson.features.length}`);
  console.log("Installing...");
  for (let i = 0; i < geojson.features.length; i++) {
    const record = geojson.features[i];
    await connection.query('INSERT INTO each_row_geojson (id, geojson) VALUES (?, ?)', [record.properties.fid, JSON.stringify(record)]);
  }
  console.log("Installed");

  // Select by MBR: (139.52246270948356, 36.251589025204765) To (139.54034174583242, 36.24221711199563)
  console.log("Select by MBR: (139.52246270948356, 36.251589025204765) To (139.54034174583242, 36.24221711199563)");
  await connection.query('SET @poly1 = ST_SRID(ST_MakeEnvelope(Point(?, ?), Point(?, ?)), 4326)', [139.52246270948356, 36.251589025204765, 139.54034174583242, 36.24221711199563]);
  const [res1] = await connection.query('SELECT geojson FROM each_row_geojson WHERE ST_Within(latlong, @poly1)');
  console.log(`Number of selected features: ${res1.length}`);
  fs.writeJsonSync("./selectedGeojson.geojson", {
    type: "FeatureCollection",
    name: "pois",
    crs: {type:"name",properties:{name:"urn:ogc:def:crs:OGC:1.3:CRS84"}},
    features: res1
  });

  // Select by MBR with index
  console.log("EXPLAIN ANALYZE: With index");
  const [res2] = await connection.query('EXPLAIN ANALYZE SELECT geojson FROM each_row_geojson WHERE ST_Within(latlong, @poly1)');
  console.log(`EXPLAIN: ${res2[0]['EXPLAIN']}`);

  // Select by MBR without index
  // Invisible Index
  await connection.query('ALTER TABLE each_row_geojson ALTER INDEX sp_index1 INVISIBLE');
  console.log("EXPLAIN ANALYZE: Without index");
  const [res3] = await connection.query('EXPLAIN ANALYZE SELECT geojson FROM each_row_geojson WHERE ST_Within(latlong, @poly1)');
  console.log(`EXPLAIN: ${res3[0]['EXPLAIN']}`);
}