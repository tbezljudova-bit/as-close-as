declare module "*.json?raw" {
  const value: string;
  export default value;
}

declare module "world-atlas/countries-50m.json" {
  const value: {
    type: "Topology";
    objects: {
      countries: {
        type: "GeometryCollection";
        geometries: unknown[];
      };
    };
    arcs: number[][][];
  };
  export default value;
}
