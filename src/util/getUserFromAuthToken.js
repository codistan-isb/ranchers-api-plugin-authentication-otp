import getAccounts from "./accountServer.js";
import hasTokenExpired from "./hasTokenExpired.js";


async function getUserFromAuthToken(loginToken) {
  const { accountsServer } = await getAccounts();
  const authToken = loginToken.replace(/bearer\s/gi, "");

  if (hasTokenExpired(authToken)) return null;

  return accountsServer.resumeSession(authToken);
}

export default getUserFromAuthToken;
