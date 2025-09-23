import { Injectable } from '@angular/core';
import { defineHex, Grid, rectangle, Hex, Orientation } from 'honeycomb-grid';
import SphericalMercator = require('sphericalmercator');

export interface HexGridConfig {
  hexSize: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class HexGridService {
  private Tile!: any;
  private Grid!: any;
  private mercator: any;

  constructor() {
    this.mercator = new SphericalMercator({
      size: 256
    });
  }

  initializeGrid(config: HexGridConfig): void {
    this.Tile = defineHex({ dimensions: config.hexSize, orientation: Orientation.POINTY });
    this.Grid = new Grid(this.Tile, rectangle({ width: config.width, height: config.height }));
  }

  getGrid(): any {
    return this.Grid;
  }

  getHexVertices(hex: any): { x: number; y: number }[] {
    return hex.corners;
  }

  pointToHex(lon: number, lat: number): any {
    const mercatorXY = this.mercator.px([lon, lat], 0);
    return this.Grid.getHex(mercatorXY);
  }

  hexToGeoJSON(hex: any): GeoJSON.Feature<GeoJSON.Polygon> {
    const vertices = this.getHexVertices(hex);
    const geoJsonBoundary = vertices.map((v: any) => this.mercator.ll([v.x, v.y], 0));
    geoJsonBoundary.push(geoJsonBoundary[0]);

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [geoJsonBoundary]
      }
    };
  }
}
