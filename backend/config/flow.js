const axios = require("axios");
const crypto = require("crypto");

class FlowAPI {
  constructor() {
    this.apiKey = process.env.FLOW_API_KEY.trim();
    this.secretKey = process.env.FLOW_SECRET_KEY.trim();
    this.baseUrl = "https://sandbox.flow.cl/api";
  }

  sign(params) {
    const keys = Object.keys(params).sort();
    let toSign = "";
    keys.forEach(key => {
      toSign += key + params[key];
    });
    return crypto.createHmac("sha256", this.secretKey).update(toSign).digest("hex");
  }

  async createPayment(data) {
    const params = {
      amount: data.amount,
      apiKey: this.apiKey,
      commerceOrder: data.commerceOrder,
      currency: "CLP",
      email: data.email,
      subject: "Suscripcion",
      urlConfirmation: data.urlConfirmation,
      urlReturn: data.urlReturn
    };

    params.s = this.sign(params);

    const formData = new URLSearchParams();
    Object.keys(params).forEach(key => formData.append(key, params[key]));

    try {
      const response = await axios.post(`${this.baseUrl}/payment/create`, formData.toString());
      return response.data;
    } catch (error) {
      console.log("Error Detalle Flow:", error.response?.data);
      throw error;
    }
  }
}
module.exports = new FlowAPI();
