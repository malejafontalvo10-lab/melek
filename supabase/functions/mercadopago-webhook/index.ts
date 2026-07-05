// Supabase Edge Function: recibe las notificaciones (IPN) de Mercado Pago,
// consulta el estado real del pago y actualiza `orders.estado`.
//
// Configurar en Mercado Pago: la preferencia ya envía notification_url apuntando aquí.
// Deploy: supabase functions deploy mercadopago-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN          = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const url       = new URL(req.url);
    const paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    const topic     = url.searchParams.get("type") ?? url.searchParams.get("topic");

    if (topic !== "payment" || !paymentId) {
      return new Response("ignored", { status: 200 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    const orderId = payment.external_reference;
    if (!orderId) return new Response("sin referencia de pedido", { status: 200 });

    const estado =
      payment.status === "approved" ? "paid" :
      payment.status === "rejected" ? "failed" :
      "pending";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from("orders")
      .update({ estado, payment_reference: String(paymentId) })
      .eq("id", orderId);

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
