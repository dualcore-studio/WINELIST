export type AppUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: number;
};

export type AppUserInput = {
  username: string;
  password?: string;
  isAdmin: boolean;
};
