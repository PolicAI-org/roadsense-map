import fs from "fs";
//Skripta za prečiščenje geojson podatkov o cestah - brez tega so prevelike datoteke
const geojson = JSON.parse(
  fs.readFileSync("roads.geojson", "utf8")
);

const roads = geojson.features
  .filter((f: any) => f.properties?.name)
  .map((f: any) => ({
    name: f.properties.name,
    coordinates: f.geometry.coordinates
  }))

fs.writeFileSync(
  "roads-min.json",
  JSON.stringify(roads)
);