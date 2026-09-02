export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";

    // Necessário para o `instanceof AppError` funcionar corretamente
    // quando a classe é transpilada para ES5/CommonJS.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
