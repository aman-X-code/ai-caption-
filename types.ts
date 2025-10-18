export interface Word {
  startTime: number;
  endTime: number;
  text: string;
}

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
  words?: Word[];
}
