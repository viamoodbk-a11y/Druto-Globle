import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Shield, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type LegalSection = "terms" | "privacy" | "refund" | null;

const Legal = () => {
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get("section") as LegalSection;
  const [activeSection, setActiveSection] = useState<LegalSection>(initialSection);

  const sections = [
    { id: "terms" as const, icon: FileText, label: "Terms & Conditions" },
    { id: "privacy" as const, icon: Shield, label: "Privacy Policy" },
    { id: "refund" as const, icon: RefreshCw, label: "Refund & Cancellation" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link to={activeSection ? "/legal" : "/"}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={(e) => {
                  if (activeSection) {
                    e.preventDefault();
                    setActiveSection(null);
                  }
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">
              {activeSection === "terms" && "Terms & Conditions"}
              {activeSection === "privacy" && "Privacy Policy"}
              {activeSection === "refund" && "Refund & Cancellation"}
              {!activeSection && "Legal"}
            </h1>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Main Menu */}
        {!activeSection && (
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            {sections.map((section, i) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left",
                  i < sections.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="flex-1 font-medium text-foreground">{section.label}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Terms & Conditions */}
        {activeSection === "terms" && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <p className="text-sm text-muted-foreground mb-4">Last updated: January 2025</p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using the Druto platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground mb-4">
                Druto is a digital loyalty rewards platform that allows customers to earn stamps by visiting participating businesses. Upon completing a stamp card, customers can redeem rewards offered by the establishment.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">3. User Accounts</h2>
              <p className="text-muted-foreground mb-4">
                You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Loyalty Rewards</h2>
              <p className="text-muted-foreground mb-4">
                Rewards are offered by individual participating businesses and are subject to their terms. Druto does not guarantee the availability of any reward and is not responsible for the quality of rewards provided by businesses.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">5. User Conduct</h2>
              <p className="text-muted-foreground mb-4">
                You agree not to misuse the Service, attempt to earn stamps fraudulently, or interfere with the platform's operation.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">6. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                Druto is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">7. Changes to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">8. Business Subscription Plans</h2>
              <p className="text-muted-foreground mb-4">
                For businesses and partners, Druto offers the "Starter Plan" at ₹999/year. This includes a 3-day free trial with no payment required to start. Features include unlimited loyalty cards, custom rewards & stamps, QR code generation, and analytics dashboard. Subscription can be cancelled at any time. Post-trial, businesses will be billed yearly. Refund policy for subscriptions is outlined in our Refund & Cancellation section.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">9. Contact</h2>
              <p className="text-muted-foreground mb-4">
                For questions about these terms, please contact us at{" "}
                <a href="mailto:contact@druto.me" className="text-primary hover:underline">
                  contact@druto.me
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Privacy Policy */}
        {activeSection === "privacy" && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <p className="text-sm text-muted-foreground mb-4">Last updated: January 2025</p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We collect information you provide directly, including phone number, name, email, and location data when you use our Service.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use your information to provide and improve the Service, process loyalty rewards, verify your location for stamp collection, and communicate with you about your account.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Location Data</h2>
              <p className="text-muted-foreground mb-4">
                We collect location data to verify that you are at a participating business when scanning QR codes. This data is used only for verification purposes and is not stored permanently.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Data Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal information. We may share data with participating businesses for the purpose of providing loyalty rewards.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">5. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, or destruction.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">6. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                You have the right to access, correct, or delete your personal data. Contact us at contact@druto.me to exercise these rights.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-4">
                We use local storage and session data to maintain your login status and preferences. We do not use third-party tracking cookies.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">8. Business Partner Data</h2>
              <p className="text-muted-foreground mb-4">
                For business partners using our Starter Plan (₹999/year), we collect additional information including business details, payment information for subscription billing, and analytics data about customer visits and rewards. This data is used to provide the loyalty platform service and generate insights for business owners.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">9. Contact</h2>
              <p className="text-muted-foreground mb-4">
                For privacy-related inquiries, please contact us at{" "}
                <a href="mailto:contact@druto.me" className="text-primary hover:underline">
                  contact@druto.me
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Refund & Cancellation */}
        {activeSection === "refund" && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <p className="text-sm text-muted-foreground mb-4">Last updated: January 2025</p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Free Service</h2>
              <p className="text-muted-foreground mb-4">
                Druto is a free platform for customers. There are no charges for collecting stamps or redeeming rewards through our Service.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Loyalty Rewards</h2>
              <p className="text-muted-foreground mb-4">
                Rewards are provided by participating businesses. The terms and conditions of each reward are set by the individual business. Druto is not responsible for the fulfillment of rewards.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Stamp Card Expiry</h2>
              <p className="text-muted-foreground mb-4">
                Stamp cards may have expiry dates set by the business. Expired stamps cannot be restored or refunded.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Business Subscription - Starter Plan</h2>
              <p className="text-muted-foreground mb-4">
                For business partners using our Starter Plan (₹999/year):
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>3-day free trial with no payment required to start</li>
                <li>Cancel anytime during trial at no cost</li>
                <li>After trial, subscription is billed yearly</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
                <li>No partial refunds for unused subscription time</li>
                <li>Refund requests within 7 days of first payment may be considered on a case-by-case basis</li>
              </ul>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">5. Account Cancellation</h2>
              <p className="text-muted-foreground mb-4">
                You may delete your account at any time. Upon deletion, all your stamps and rewards will be permanently removed and cannot be recovered.
              </p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">6. Disputes</h2>
              <p className="text-muted-foreground mb-4">
                For any disputes regarding rewards or stamps, please contact the participating business directly. For platform-related issues, contact us at{" "}
                <a href="mailto:contact@druto.me" className="text-primary hover:underline">
                  contact@druto.me
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Legal;
