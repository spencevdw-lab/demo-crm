import PageHeader from "@/components/PageHeader";
import NewsletterForm from "./NewsletterForm";

export const dynamic = "force-dynamic";

export default function NewsletterPage() {
  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle="Build and send a branded newsletter to your contacts by sector."
      />
      <NewsletterForm />
    </div>
  );
}
