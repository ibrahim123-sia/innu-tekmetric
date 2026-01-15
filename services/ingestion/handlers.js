import db from "../ingestion/db.js";
export const tekmetricWebhook = async (req, res) => {
  try {
    // 1. Log for debugging
    console.log("Tekmetric Webhook received:", JSON.stringify(req.body));

    // 2. Respond immediately (200 OK)
    res.status(200).json({ message: "Webhook received successfully" });

    // 3. Extract Data
    // Note: Tekmetric usually wraps the order in a 'data' object or sends flat fields.
    // Adjust these keys based on the REAL payload you see in logs.
    const { id, repair_order_number, repair_order_status_id, shopId } = req.body;

    console.log("Processing Order:", repair_order_number);

    // 4. Validate
    if (!repair_order_number || !shopId) {
        console.warn("⚠️ Missing data, skipping DB insert.");
        return;
    }

    // 5. Insert into DB
    // We use a Sub-Query to get the UUID for the shop based on Tekmetric's ID
    const queryText = `
        INSERT INTO orders (
            tekmetric_ro_id, 
            ro_number, 
            status, 
            shop_id, 
            updated_at
        ) 
        VALUES ($1, $2, $3, (SELECT id FROM shops WHERE tekmetric_shop_id = $4), NOW())
        ON CONFLICT (shop_id, tekmetric_ro_id) 
        DO UPDATE SET 
            status = EXCLUDED.status,
            updated_at = NOW()
        RETURNING id;
    `;

    const values = [id, repair_order_number, repair_order_status_id, shopId];

    const result = await db.query(queryText, values);
    console.log("✅ Data synced, DB ID:", result.rows[0]?.id);

  } catch (err) {
    console.error("❌ Error inserting webhook data:", err);
    // Don't send a response here, we already sent 200.
  }
};