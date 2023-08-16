import jwtDecode from "jwt-decode";


export default function hasTokenExpired(authToken) {
  const currentTime = Date.now() / 1000;
  const decodedToken = jwtDecode(authToken);
  return decodedToken.exp < currentTime;
}
