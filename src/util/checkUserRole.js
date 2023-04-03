export function canCreateUser(DbUserRole, userRoleNeeded) {
  if (DbUserRole === "Admin" || DbUserRole === "admin") {
    return true;
  } else if (DbUserRole === "Dispatcher" || DbUserRole === "dispatcher") {
    if (userRoleNeeded === "admin") {
      return false;
    } else {
      return true;
    }
  } else if (DbUserRole === "Rider" || DbUserRole === "rider") {
    return false;
  }
}
