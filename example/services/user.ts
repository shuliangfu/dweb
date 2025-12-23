import { User } from "../models/User.ts";

export const getUser = async (id: string) => {
  return await User.findById(id);
};

export const createUser = async (user: User) => {
  return await User.create(user);
};

export const updateUser = async (id: string, user: User) => {
  return await User.updateById(id, user);
};

export const deleteUser = async (id: string) => {
  return await User.deleteById(id);
};