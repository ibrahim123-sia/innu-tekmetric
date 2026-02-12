import db from "./db.js";
import axios from "axios";

export const tekmetricWebhook = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      console.warn("⚠️ Webhook received but no data object.");
      return res.status(200).json({ message: "No data payload" });
    }

    const {
      id: tekmetricRoId,
      repairOrderNumber,
      shopId: tekmetricShopId,
      repairOrderStatus,
      customerId,
      customerConcerns,
      vehicleId,
    } = data;

    if (!tekmetricRoId || !repairOrderNumber || !tekmetricShopId) {
      console.warn("⚠️ Missing required fields.");
      return res.status(200).json({ message: "Missing required fields" });
    }

    const customer_concerns = Array.isArray(customerConcerns)
      ? customerConcerns.map((c) => c.concern)
      : [];

    let customer_name = null;

    if (customerId) {
      const customerResponse = await axios.get(
        `https://shop.tekmetric.com/api/v1/customers/${customerId}?shop=${tekmetricShopId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TEKMETRIC_API_KEY}`,
          },
        },
      );

      customer_name =
        customerResponse?.data?.firstName +
        " " +
        customerResponse?.data?.lastName;
    }
    console.log("customer name", customer_name);
    let vehicle_info = null;

    if (vehicleId) {
      const vehicleResponse = await axios.get(
        `https://shop.tekmetric.com/api/v1/vehicles/${vehicleId}?shop=${tekmetricShopId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TEKMETRIC_API_KEY}`,
          },
        },
      );
console.log(vehicleResponse)
      if (vehicleResponse) {
        vehicle_info = {
          make: vehicleResponse?.data?.make || null,
          model: vehicleResponse?.data?.model || null,
          year: vehicleResponse?.data?.year || null,
          license_plate: vehicleResponse?.data?.license_plate || null,
          body_type: vehicleResponse?.data?.body_type || null,
          sub_model: vehicleResponse?.data?.sub_model || null,
        };
      }
    }
    console.log("");
    const statusValue = repairOrderStatus?.name || "Unknown";

    const queryText = `
      INSERT INTO orders (
        tekmetric_ro_id,
        ro_number,
        status,
        shop_id,
        customer_name,
        customer_concern,
        vehicle_info,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        (SELECT id FROM shops WHERE tekmetric_shop_id = $4),
        $5,
        $6,
        $7,
        NOW()
      )
      ON CONFLICT (shop_id, tekmetric_ro_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        customer_name = EXCLUDED.customer_name,
        customer_concern = EXCLUDED.customer_concern,
        vehicle_info = EXCLUDED.vehicle_info,
        updated_at = NOW()
      RETURNING id;
    `;

    const values = [
      tekmetricRoId,
      repairOrderNumber,
      statusValue,
      tekmetricShopId,
      customer_name,
      customer_concerns,
      JSON.stringify(vehicle_info),
    ];

    const result = await db.query(queryText, values);

    if (result.rows.length > 0) {
      console.log("✅ Order synced. DB ID:", result.rows[0].id);
    } else {
      console.warn(
        `⚠️ Shop not found for Tekmetric Shop ID: ${tekmetricShopId}`,
      );
    }

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Tekmetric Webhook Error:", error.message);

    return res.status(200).json({
      message: "Webhook received but processing failed",
    });
  }
};
