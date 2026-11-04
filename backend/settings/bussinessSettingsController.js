import {
  getBusinessSettings,
  updateBusinessSettings,
} from "./businessSettingsModel.js";

export async function fetchBusinessSettings(req, res) {
  try {
    const settings = await getBusinessSettings();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Business settings not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Fetch business settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch business settings.",
    });
  }
}

export async function saveBusinessSettings(req, res) {
  try {
    const {
      business_name,
      phone,
      email,
      address,
      currency,
      receipt_header,
      receipt_footer,
      tax_enabled,
      tax_rate,
    } = req.body;

    if (!business_name || !business_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required.",
      });
    }

    if (!["KES", "USD", "NGN", "EUR", "GBP"].includes(currency)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported currency.",
      });
    }

    if (typeof tax_enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Tax enabled must be true or false.",
      });
    }

    const parsedTaxRate = Number(tax_rate);

    if (
      !Number.isFinite(parsedTaxRate) ||
      parsedTaxRate < 0 ||
      parsedTaxRate > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Tax rate must be between 0 and 100.",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const settings = await updateBusinessSettings({
      business_name: business_name.trim(),
      phone,
      email,
      address,
      currency,
      receipt_header,
      receipt_footer,
      tax_enabled,
      tax_rate: parsedTaxRate,
    });

    return res.status(200).json({
      success: true,
      message: "Business settings updated successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("Save business settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update business settings.",
    });
  }
}