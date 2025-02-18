export function getOrganization(url: String): String {
  let urlParts = url.split("/");
  let orgSlug = "";
  if (urlParts[1] == "organizations") {
    orgSlug = urlParts[2];
  } else {
    orgSlug = urlParts[1];
  }
  return orgSlug;
}
