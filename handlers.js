import db from "./db.js";

export const tekmetricWebhook = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      console.warn("⚠️ Webhook received but no 'data' object found.");
      return;
    }

    const {
      id: tekmetricRoId,
      repairOrderNumber,
      shopId: tekmetricShopId,
      repairOrderStatus,
    } = data;

    if (!repairOrderNumber || !tekmetricShopId) {
      console.warn("⚠️ Missing critical data, skipping.");
      return;
    }

    const statusValue = repairOrderStatus?.name || "Unknown";

    const queryText = `
        INSERT INTO orders (
            tekmetric_ro_id, 
            ro_number, 
            status, 
            shop_id,            -- Internal Database ID (Foreign Key)
            tekmetric_shop_id,  -- Raw Tekmetric ID 
            updated_at
        ) 
        VALUES (
            $1, 
            $2, 
            $3, 
            (SELECT id FROM shops WHERE tekmetric_shop_id = $4), -- Lookup Internal ID
            $4, -- Insert Raw ID
            NOW()
        )
        ON CONFLICT (shop_id, tekmetric_ro_id) 
        DO UPDATE SET 
            status = EXCLUDED.status,
            updated_at = NOW()
        RETURNING id;
    `;

    const values = [
      tekmetricRoId,
      repairOrderNumber,
      statusValue,
      tekmetricShopId,
    ];

    const result = await db.query(queryText, values);

    if (result.rows.length > 0) {
      console.log("✅ Data synced, Order DB ID:", result.rows[0].id);
    } else {
      console.warn(
        `⚠️ Insert failed. Check if Tekmetric Shop ID ${shopId} exists in your 'shops' table.`,
      );
    }

    res.status(200).json({ message: "Webhook received successfully" });
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    res.status(200).json({
      message: "Webhook received successfully but could not be stored",
    });
  }
};
