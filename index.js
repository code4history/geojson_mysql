import mysql from "mysql2/promise";
import dotenv from "dotenv";
const res = dotenv.config();
const env = res.parsed;

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

  const { whole_geojson } = await import("./cases/whole_geojson.js");
  await whole_geojson(connection);
  console.log("");

  const { each_row_geojson } = await import("./cases/each_row_geojson.js");
  await each_row_geojson(connection);
  console.log("");

  const { us_flatgeobuf } = await import("./cases/us_flatgeobuf.js");
  await us_flatgeobuf(connection);
};

main();