const { AppError } = require("../errors/app-error");

class ProductService {
  constructor(repository) {
    this.repository = repository;
  }

  async list() {
    return this.repository.list();
  }

  async get(id) {
    const product = await this.repository.findById(id);
    if (!product) {
      throw this.notFound();
    }
    return product;
  }

  async create(input) {
    return this.repository.create(input);
  }

  async replace(id, input) {
    const product = await this.repository.replace(id, input);
    if (!product) {
      throw this.notFound();
    }
    return product;
  }

  async delete(id) {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw this.notFound();
    }
  }

  notFound() {
    return new AppError(404, "Product not found", "No product exists with the requested id.", {
      code: "PRODUCT_NOT_FOUND"
    });
  }
}

module.exports = { ProductService };
