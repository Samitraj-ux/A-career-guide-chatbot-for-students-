export type Role = 'user' | 'model';

export interface Citation {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  citations?: Citation[];
}
