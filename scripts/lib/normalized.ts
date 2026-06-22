// Intermediate shape produced by each source adapter before final assembly.
export interface NormalizedRaw {
  source: string;
  sourceId: string;
  title: string;
  artist: string;
  yearDisplay: string;
  museum: string;
  museumLocation: string;
  image: string;
  thumbnail: string;
  medium: string;
  culture: string;
  department: string;
  classification: string;
  styles: string[]; // movement candidates
  sourceUrl: string;
}
