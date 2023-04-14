import { genSalt, hash, compare } from 'bcryptjs';

export const bcryptPassword = async (password) => {
    const salt = await genSalt(10);
    const hashedPassword = await hash(password, salt);
    return hashedPassword;
};
