// Supabase Edge Function: crea una preferencia de pago (Checkout Pro) en Mercado Pago
// para un pedido ya existente en la tabla `orders`, y devuelve el init_point para redirigir.
//
// Requiere el secreto MP_ACCESS_TOKEN (Access Token de producción o de prueba de Mercado Pago):
//   supabase secrets set MP_ACCESS_TOKEN=tu_access_token
//
// Deploy: supabase functions deploy create-preference

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN            = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL                = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // El navegador envía un preflight OPTIONS antes del POST real; sin esto, el POST nunca llega.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total, costo_envio, order_items(nombre_producto, precio_unitario, cantidad)")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = order.order_items.map((it: any) => ({
      title: it.nombre_producto,
      quantity: it.cantidad,
      unit_price: it.precio_unitario,
      currency_id: "COP",
    }));

    if (order.costo_envio > 0) {
      items.push({ title: "Envío", quantity: 1, unit_price: order.costo_envio, currency_id: "COP" });
    }

    const origin = req.headers.get("origin") ?? "";

    const preference = {
      items,
      external_reference: order.id,
      back_urls: {
        success: origin,
        failure: origin,
        pending: origin,
      },
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: mpData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("orders").update({ payment_reference: mpData.id }).eq("id", order.id);

    return new Response(JSON.stringify({ init_point: mpData.init_point }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
