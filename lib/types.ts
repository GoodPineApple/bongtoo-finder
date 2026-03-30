export type StoreRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

export type ReportRow = {
  id?: string;
  store_id: string;
  is_available: boolean;
  created_at: string;
};
