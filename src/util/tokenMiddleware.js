import Logger from "@reactioncommerce/logger";
import getUserFromAuthToken from "./getUserFromAuthToken.js";


export default function tokenMiddleware() {
  return async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
      next();
      return;
    }

    try {
      req.user = await getUserFromAuthToken(token);
      next();
    } catch (error) {
      Logger.error(error);
      res.status(401).json({
        code: 401,
        message: "Unauthorized"
      });
    }
  };
}
