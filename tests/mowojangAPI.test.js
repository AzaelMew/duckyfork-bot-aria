const axios = require("axios");
jest.mock("axios");
const { getUUID, getUsername } = require("../src/contracts/API/mowojangAPI.js");
const ID = "069a79f444e94726a5befca90e38aaf5";
const err = (status, data) => Object.assign(new Error("x"), { response: { status, data } });
beforeEach(() => axios.get.mockReset());

test("primary 502 -> falls back to api.mojang.com", async () => {
  axios.get.mockRejectedValueOnce(err(502, "bad gateway")).mockResolvedValueOnce({ data: { id: ID, name: "Notch" } });
  expect(await getUUID("Notch")).toBe(ID);
  expect(axios.get.mock.calls[1][0]).toContain("api.mojang.com/users/profiles/minecraft/Notch");
});
test("primary network error (no response) falls back, no TypeError", async () => {
  axios.get.mockRejectedValueOnce(new Error("ECONNRESET")).mockResolvedValueOnce({ data: { id: ID, name: "Jeb_" } });
  expect(await getUUID("Jeb_")).toBe(ID);
});
test("primary 'Not found' -> Invalid username, no fallback", async () => {
  axios.get.mockRejectedValueOnce(err(404, "Not found"));
  await expect(getUUID("Nobody1")).rejects.toBe("Invalid username.");
  expect(axios.get).toHaveBeenCalledTimes(1);
});
test("primary down + mojang 404 -> Invalid username", async () => {
  axios.get.mockRejectedValueOnce(err(502, "")).mockRejectedValueOnce(err(404, {}));
  await expect(getUUID("Nobody2")).rejects.toBe("Invalid username.");
});
test("both down -> throws", async () => {
  axios.get.mockRejectedValue(new Error("down"));
  await expect(getUUID("Nobody3")).rejects.toThrow("down");
});
test("cache hit does no request", async () => {
  axios.get.mockResolvedValueOnce({ data: { id: ID, name: "Cached" } });
  await getUUID("Cached");
  axios.get.mockClear();
  expect(await getUUID("Cached")).toBe(ID);
  expect(axios.get).not.toHaveBeenCalled();
});
test("getUsername falls back to sessionserver", async () => {
  axios.get.mockRejectedValueOnce(err(502, "")).mockResolvedValueOnce({ data: { id: ID, name: "Notch" } });
  expect(await getUsername(ID)).toBe("Notch");
  expect(axios.get.mock.calls[1][0]).toContain("sessionserver.mojang.com/session/minecraft/profile/" + ID);
});
