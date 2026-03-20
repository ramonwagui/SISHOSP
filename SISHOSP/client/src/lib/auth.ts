export function getCurrentUser() {
  return sessionStorage.getItem("isAdminLoggedIn") === "true" ? { username: "admin" } : null;
}

export function logout() {
  sessionStorage.removeItem("isAdminLoggedIn");
}