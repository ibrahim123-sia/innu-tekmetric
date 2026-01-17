import db from "../ingestion/db.js";

export const tekmetricWebhook = async (req, res) => {
  try {
    // 1. Acknowledge receipt immediately
    res.status(200).json({ message: "Webhook received successfully" });

    // 2. Extract Data
    const { data } = req.body;

    if (!data) {
       console.warn("⚠️ Webhook received but no 'data' object found.");
       return;
    }

    // 3. Destructure fields (Mapping CamelCase from payload)
    const {
        id: tekmetricRoId,
        repairOrderNumber,
        tekmetricShopId, 
        repairOrderStatus
    } = data;

    // 4. Validate
    if (!repairOrderNumber || !tekmetricShopId) {
        console.warn("⚠️ Missing critical data, skipping.");
        return;
    }

    const statusValue = repairOrderStatus?.name || "Unknown";

    // 5. Insert/Upsert into DB
    // We insert into 'shop_id' (internal FK) via lookup AND 'tekmetric_shop_id' (raw value)
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

    const values = [tekmetricRoId, repairOrderNumber, statusValue, tekmetricShopId];

    const result = await db.query(queryText, values);
    
    // 6. Validation Log
    // If the subquery (SELECT id FROM shops...) returns NULL because the shop doesn't exist,
    // the insert might fail (if shop_id is NOT NULL) or insert a NULL. 
    // This check helps confirm a row was actually touched.
    if (result.rows.length > 0) {
        console.log("✅ Data synced, Order DB ID:", result.rows[0].id);
    } else {
        console.warn(`⚠️ Insert failed. Check if Tekmetric Shop ID ${shopId} exists in your 'shops' table.`);
    }

  } catch (err) {
    console.error("❌ Error processing webhook:", err);
  }
};