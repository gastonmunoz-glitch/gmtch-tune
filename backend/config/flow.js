const axios = require("axios");
const crypto = require("crypto");

class FlowAPI {
  constructor() {
    this.apiKey = (process.env.FLOW_API_KEY || "").trim();
    this.secretKey = (process.env.FLOW_SECRET_KEY || "").trim();
    this.env = String(process.env.FLOW_ENV || "sandbox").trim().toLowerCase();
    this.baseUrl = this.resolverBaseUrl();
  }

  resolverBaseUrl() {
    const custom = String(process.env.FLOW_BASE_URL || "").trim();
    if (custom) return custom.replace(/\/$/, "");
    if (this.env === "production" || this.env === "prod") return "https://www.flow.cl/api";
    return "https://sandbox.flow.cl/api";
  }

  validarCredenciales() {
    if (!this.apiKey || !this.secretKey) {
      throw new Error("FLOW_API_KEY y FLOW_SECRET_KEY son obligatorias para usar Flow.");
    }
  }

  sign(params) {
    this.validarCredenciales();
    const keys = Object.keys(params).sort();
    let toSign = "";
    keys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        toSign += key + params[key];
      }
    });
    return crypto.createHmac("sha256", this.secretKey).update(toSign).digest("hex");
  }

  async createPayment(data) {
    this.validarCredenciales();

    const params = {
      amount: data.amount,
      apiKey: this.apiKey,
      commerceOrder: data.commerceOrder,
      currency: "CLP",
      email: data.email,
      subject: data.subject || "Compra GMTCH",
      urlConfirmation: data.urlConfirmation,
      urlReturn: data.urlReturn
    };

    if (data.optional !== undefined && data.optional !== null) {
      params.optional =
        typeof data.optional === "string" ? data.optional : JSON.stringify(data.optional);
    }

    params.s = this.sign(params);

    const formData = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        formData.append(key, params[key]);
      }
    });

    try {
      const response = await axios.post(`${this.baseUrl}/payment/create`, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return response.data;
    } catch (error) {
      console.log("Error Detalle Flow:", error.response?.data);
      throw error;
    }
  }

  async getPaymentStatus(token) {
    this.validarCredenciales();

    if (!token) {
      throw new Error("Token Flow requerido para consultar estado de pago.");
    }

    const params = {
      apiKey: this.apiKey,
      token,
    };

    params.s = this.sign(params);

    try {
      const response = await axios.get(`${this.baseUrl}/payment/get`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.log("Error consultando estado Flow:", error.response?.data);
      throw error;
    }
  }
}
module.exports = new FlowAPI();
