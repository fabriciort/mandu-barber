import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/ui/misc";
import { requireOwner } from "@/server/auth/guards";
import { getShopConfig } from "@/server/services/settings";
import { prisma } from "@/server/db";

export const metadata = { title: "Configuracoes" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireOwner("/painel/configuracoes");
  const shop = await getShopConfig();

  const hours = await prisma.businessHour.findMany({
    where: { shopId: "shop" },
    orderBy: { weekday: "asc" },
  });

  const businessHours = Array.from({ length: 7 }, (_, weekday) => {
    const found = hours.find((h) => h.weekday === weekday);
    return {
      weekday,
      openMinute: found?.openMinute ?? 9 * 60,
      closeMinute: found?.closeMinute ?? 19 * 60,
      closed: found?.closed ?? weekday === 0,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes"
        description="Dados da loja, funcionamento e as regras que governam o agendamento online."
      />

      <SettingsForm
        settings={{
          name: shop.name,
          tagline: shop.tagline,
          phone: shop.phone,
          whatsapp: shop.whatsapp,
          email: shop.email,
          addressLine: shop.addressLine,
          district: shop.district,
          city: shop.city,
          state: shop.state,
          zipCode: shop.zipCode,
          instagram: shop.instagram,
          mapsUrl: shop.mapsUrl,
          slotStepMinutes: shop.slotStepMinutes,
          minLeadMinutes: shop.minLeadMinutes,
          maxAdvanceDays: shop.maxAdvanceDays,
          cancellationWindowHours: shop.cancellationWindowHours,
          allowOnlineBooking: shop.allowOnlineBooking,
        }}
        businessHours={businessHours}
      />
    </div>
  );
}
