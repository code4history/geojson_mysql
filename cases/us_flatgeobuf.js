import { geojson as fgb } from 'flatgeobuf';
import { readFileSync, writeFileSync }  from 'node:fs';
import path from "node:path";
import fs from "fs-extra";
const buffer = readFileSync('./UScounties.fgb');
const geojson = fgb.deserialize(new Uint8Array(buffer));

export async function us_flatgeobuf(connection) {
  console.log("## Result of flatgeobuf case");
  // Create Table
  // For insert FlatGeoBuf
  await connection.query(`CREATE TABLE us_flatgeobuf(
    id INT NOT NULL AUTO_INCREMENT,
    geojson JSON,
    latlong GEOMETRY AS (ST_GeomFromGeoJSON(geojson, 1, 4326)) STORED NOT NULL SRID 4326,
    PRIMARY KEY (id),
    SPATIAL INDEX sp_index2 (latlong)
  );`);

  // Insert FlatGeoBuf's each record
  console.log(`Total number of features: ${geojson.features.length}`);
  console.log("Installing...");
  for (let i = 0; i < geojson.features.length; i++) {
    const record = geojson.features[i];
    await connection.query('INSERT INTO us_flatgeobuf (geojson) VALUES (?)', [JSON.stringify(record)]);
  }
  console.log("Installed");

  // Select by MBR: (-124.42278337796137, 39.3058971532753) To (-114.7085706097631, 35.73909681729993)
  console.log("Select by MBR: (-124.42278337796137, 39.3058971532753) To (-114.7085706097631, 35.73909681729993)");
  await connection.query('SET @poly2 = ST_SRID(ST_MakeEnvelope(Point(?, ?), Point(?, ?)), 4326)', [-124.42278337796137, 39.3058971532753, -114.7085706097631, 35.73909681729993]);
  const [res1] = await connection.query('SELECT geojson FROM us_flatgeobuf WHERE ST_Within(latlong, @poly2)');
  console.log(`Number of selected features: ${res1.length}`);
  fs.writeJsonSync("./selectedFlatgeobuf.geojson", {
    type: "FeatureCollection",
    name: "pois",
    crs: {type:"name",properties:{name:"urn:ogc:def:crs:OGC:1.3:CRS84"}},
    features: res1
  });

  // Select by MBR with index
  console.log("EXPLAIN ANALYZE: With index");
  const [res2] = await connection.query('EXPLAIN ANALYZE SELECT geojson FROM us_flatgeobuf WHERE ST_Within(latlong, @poly2)');
  console.log(`EXPLAIN: ${res2[0]['EXPLAIN']}`);

  // Select by MBR without index
  // Invisible Index
  await connection.query('ALTER TABLE us_flatgeobuf ALTER INDEX sp_index2 INVISIBLE');
  console.log("EXPLAIN ANALYZE: Without index");
  const [res3] = await connection.query('EXPLAIN ANALYZE SELECT geojson FROM us_flatgeobuf WHERE ST_Within(latlong, @poly2)');
  console.log(`EXPLAIN: ${res3[0]['EXPLAIN']}`);
}

