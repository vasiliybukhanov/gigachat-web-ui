export default defineNitroPlugin((nitroApp) => {
  const timer = setInterval(() => getToken(), 25 * 60_000);

  nitroApp.hooks.hook("close", () => clearInterval(timer));
});
