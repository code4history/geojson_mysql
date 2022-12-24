import fs from "fs-extra";
const geojson = fs.readJsonSync("./tatebayashi_stones.geojson");

export async function whole_geojson(connection) {
  console.log("## Result of geojson case (Whole geojson)");
  // Create Table
  // For insert whole GeoJSON
  await connection.query(`CREATE TABLE whole_geojson(
    id INT NOT NULL AUTO_INCREMENT,
    geojson JSON,
    PRIMARY KEY (id)
  );`);

  // Insert whole GeoJson
  console.log(`Total number of features: ${geojson.features.length}`);
  console.log("Installing...");
  await connection.query('INSERT INTO whole_geojson (geojson) VALUES (?);', JSON.stringify(geojson));
  console.log("Installed");

  console.log("No idea...")
}