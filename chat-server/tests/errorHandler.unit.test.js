const errorHandler = require("../api/middleware/errorHandler");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("errorHandler", () => {
  test("ValidationError de mongoose responde 400 con errores", () => {
    const res = mockRes();
    const err = { name: "ValidationError", errors: { nombre: { message: "Requerido" } } };
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errores[0]).toEqual({ campo: "nombre", mensaje: "Requerido" });
  });

  test("ValidationError sin detalle usa un campo general", () => {
    const res = mockRes();
    errorHandler({ name: "ValidationError", message: "fallo" }, {}, res, jest.fn());
    expect(res.json.mock.calls[0][0].errores[0].campo).toBe("general");
  });

  test("Error de zod responde 400 con errores", () => {
    const res = mockRes();
    const err = { name: "ZodError", issues: [{ path: ["correo"], message: "Inválido" }] };
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errores[0]).toEqual({ campo: "correo", mensaje: "Inválido" });
  });

  test("Error de zod sin path usa el campo body", () => {
    const res = mockRes();
    errorHandler({ issues: [{ message: "Mal" }] }, {}, res, jest.fn());
    expect(res.json.mock.calls[0][0].errores[0].campo).toBe("body");
  });

  test("CastError responde 400", () => {
    const res = mockRes();
    errorHandler({ name: "CastError", value: "abc" }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Clave duplicada (11000) responde 409", () => {
    const res = mockRes();
    errorHandler({ code: 11000, keyValue: { isbn: "1" } }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("Clave duplicada sin keyValue usa 'campo'", () => {
    const res = mockRes();
    errorHandler({ code: 11000 }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("Error con status y message usa ese status", () => {
    const res = mockRes();
    errorHandler({ status: 403, message: "Prohibido" }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("Error desconocido responde 500", () => {
    const res = mockRes();
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    errorHandler(new Error("boom"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });
});