import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs-extra";
const res = dotenv.config();
const env = res.parsed;
const geojson = fs.readJsonSync("./tatebayashi_stones.geojson");

const main = async () => {
  // Connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: env.USER,
    password: env.PASS
  });

  // Drop Database
  await connection.query("DROP DATABASE geojson;");

  // Create & Use Database
  await connection.query("CREATE DATABASE geojson;");
  await connection.query("USE geojson;");

  // Create Table
  // For insert whole GeoJSON
  await connection.query(`CREATE TABLE geojson_whole(
    id INT NOT NULL AUTO_INCREMENT,
    geojson JSON,
    PRIMARY KEY (id)
  );`);
  // For insert GeoJSON records
  await connection.query(`CREATE TABLE geojson_records(
    id INT NOT NULL,
    geojson JSON,
    latlong GEOMETRY AS (
      ST_SRID(Point(JSON_EXTRACT(geojson, "$.geometry.coordinates[0]"), JSON_EXTRACT(geojson, "$.geometry.coordinates[1]")), 4326)
    ) STORED NOT NULL,
    PRIMARY KEY (id),
    SPATIAL INDEX sp_index (latlong) INVISIBLE
  );`);

  // Insert whole GeoJson
  await connection.query('INSERT INTO geojson_whole(geojson) VALUES (?)', JSON.stringify(geojson));

  // Insert GeoJson's each record
  for (let i = 0; i < geojson.features.length; i++) {
    const record = geojson.features[i];
    await connection.query('INSERT INTO geojson_records(id, geojson) VALUES (?, ?)', [record.properties.fid, JSON.stringify(record)]);
  }

  // Select by MBR: (139.52246270948356, 36.251589025204765) To (139.54034174583242, 36.24221711199563)
  await connection.query('SET @poly = ST_SRID(ST_MakeEnvelope(Point(?, ?), Point(?, ?)), 4326)', [139.52246270948356, 36.251589025204765, 139.54034174583242, 36.24221711199563]);
  const [res1] = await connection.query('EXPLAIN ANALYZE SELECT geojson FROM geojson_records WHERE ST_Within(latlong, @poly)');
  console.log(res1);

  // Invisible Index
  await connection.query('ALTER TABLE geojson_records ALTER INDEX sp_index VISIBLE');

  // Select by MBR without index
  const [res2] = await connection.query('EXPLAIN ANALYZE SELECT geojson FROM geojson_records WHERE ST_Within(latlong, @poly)');
  console.log(res2);

  //await connection.connect();
  //console.log('success');
  //const [rows] = await connection.query('SELECT * FROM geojson');
  //console.log(rows);
  //const [res] = await connection.query('INSERT INTO geojson(geojson) VALUES (?)', JSON.stringify({"hoge": "fuga"}));
  /*connection.connect((err) => {
    if (err) {
      console.log('error connecting: ' + err.stack);
      return;
    }
    console.log('success');
  });*/
};

main();