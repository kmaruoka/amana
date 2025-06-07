"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.get('/shrines/nearby', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = parseInt(req.query.radius) || 100;
    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
    }
    // PostGIS distance calculation
    const shrines = await prisma.$queryRawUnsafe(`SELECT id, name, latitude, longitude
     FROM "Shrine"
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )`, lon, lat, radius);
    res.json(shrines);
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
