"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Mail,
  Store,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { publishRegistrationNotice } from "@/lib/registration-notice";

const STEPS = ["Account", "Shop details", "Connect PayPal", "Go live"];

const INITIAL_FORM = {
  fullName: "",
  email: "",
  password: "",
  shopName: "",
  category: "Footwear",
  country: "",
  phone: "",
  paypalEmail: "",
  merchantId: "",
};

const FIELD_CLASS =
  "mt-1.5 min-h-11 w-full rounded-[11px] border border-[#dbe3ee] bg-white px-3 py-2.5 text-[13px] text-[#111719] outline-none transition placeholder:text-[#879196] focus:border-[#17815d] focus:ring-2 focus:ring-[#17815d]/10";

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
  autoComplete,
}) {
  return (
    <label className="block min-w-0 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#536276]">
      {label}
      <input
        className={FIELD_CLASS}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={type === "password" ? 8 : undefined}
        autoComplete={autoComplete}
      />
    </label>
  );
}

export default function SignupStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleContinue = (event) => {
    event.preventDefault();
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleFinish = (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const registration = {
      businessName: form.shopName.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      category: form.category,
      country: form.country.trim(),
      phone: form.phone.trim(),
      platform: "SwiftCart Seller Demo",
      paypalEmail: form.paypalEmail.trim(),
      merchantId: form.merchantId.trim(),
      registeredAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      "swiftcart-store-registration",
      JSON.stringify(registration),
    );
    publishRegistrationNotice(registration.businessName);
    router.push("/");
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
            <Field
              label="Full name"
              name="fullName"
              value={form.fullName}
              onChange={updateField}
              placeholder="Your full name"
              autoComplete="name"
            />
            <Field
              label="Email"
              name="email"
              value={form.email}
              onChange={updateField}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              value={form.password}
              onChange={updateField}
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-[#657276]">
            Password is used only for this demo step and is never saved.
          </p>
        </>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
          <Field
            label="Shop name"
            name="shopName"
            value={form.shopName}
            onChange={updateField}
            placeholder="Your shop name"
          />
          <label className="block min-w-0 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#536276]">
            Category
            <select
              className={FIELD_CLASS}
              name="category"
              value={form.category}
              onChange={updateField}
            >
              <option>Footwear</option>
              <option>Apparel</option>
              <option>Sports &amp; outdoors</option>
              <option>Electronics</option>
              <option>Home &amp; lifestyle</option>
              <option>Other</option>
            </select>
          </label>
          <Field
            label="Country"
            name="country"
            value={form.country}
            onChange={updateField}
            placeholder="Country or region"
            autoComplete="country-name"
          />
          <Field
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={updateField}
            type="tel"
            placeholder="Phone number"
            autoComplete="tel"
          />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-[12px] bg-[#f2f7f6] p-4">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#087650]" />
            <p className="text-xs leading-relaxed text-[#4e5b5e]">
              Enter the PayPal Sandbox account details you use for this demo. No
              PayPal login or authorization is performed here.
            </p>
          </div>
          <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
            <Field
              label="PayPal email"
              name="paypalEmail"
              value={form.paypalEmail}
              onChange={updateField}
              type="email"
              placeholder="seller@example.com"
              autoComplete="email"
            />
            <Field
              label="Merchant ID"
              name="merchantId"
              value={form.merchantId}
              onChange={updateField}
              placeholder="Sandbox merchant ID"
              required={false}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#087650]">
            <LockKeyhole className="h-3.5 w-3.5" />
            Sandbox mode only. No real payments are moved.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="divide-y divide-[#e8eeee] rounded-[12px] border border-[#e8eeee] px-4">
          {[
            ["Account", form.fullName, form.email],
            ["Shop", form.shopName, `${form.category} · ${form.country}`],
            [
              "PayPal",
              form.paypalEmail,
              form.merchantId || "Merchant ID not provided",
            ],
          ].map(([label, primary, secondary]) => (
            <div
              key={label}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"
            >
              <span className="w-20 shrink-0 font-extrabold uppercase tracking-wide text-[#536276]">
                {label}
              </span>
              <span className="min-w-0 flex-1 text-right font-semibold text-[#171d1e]">
                {primary}
                <span className="mt-0.5 block truncate text-[10px] font-normal text-[#657276]">
                  {secondary}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-[#657276]">
          Finishing setup stores this demo profile in this browser and opens
          Shop. It does not publish a live store or connect PayPal.
        </p>
      </div>
    );
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="mb-4">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            New seller
          </span>
          <h1 className="text-4xl font-black uppercase leading-[0.98] text-[#111416] sm:text-[54px]">
            {step === 0
              ? "Open your shop."
              : STEPS[step] === "Shop details"
                ? "Tell us about your shop."
                : step === 2
                  ? "Connect PayPal."
                  : "Review your setup."}
          </h1>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#536064] sm:text-sm">
            {step === 0
              ? "Tell us about your shop. It takes about two minutes."
              : step === 1
                ? "Add the details shoppers will see when your products appear."
                : step === 2
                  ? "Link the Sandbox account used for your seller demo."
                  : "Check your details before returning to the shopper experience."}
          </p>
        </div>

        <ol
          aria-label="Seller setup steps"
          className="mb-5 flex gap-2 overflow-x-auto pb-1"
        >
          {STEPS.map((label, index) => (
            <li key={label} className="shrink-0">
              <button
                type="button"
                disabled={index > step}
                onClick={() => index < step && setStep(index)}
                aria-current={index === step ? "step" : undefined}
                className={`seller-step-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-[10px] font-semibold transition disabled:cursor-not-allowed ${index === step ? "seller-step-active bg-[#111416] text-white" : index < step ? "seller-step-complete bg-[#e2f4eb] text-[#087650]" : "seller-step-upcoming bg-white text-[#536276]"}`}
              >
                {index < step ? <Check className="h-3 w-3" /> : `${index + 1}.`}
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_0.88fr]">
          <form
            key={step}
            method="post"
            onSubmit={step === STEPS.length - 1 ? handleFinish : handleContinue}
            className="rounded-[18px] border border-[#e5ebeb] bg-white p-5 sm:p-7"
          >
            <div className="mb-5 flex items-center gap-2">
              {step === 0 ? (
                <Mail className="h-4 w-4 text-[#087650]" />
              ) : step === 1 ? (
                <Building2 className="h-4 w-4 text-[#087650]" />
              ) : step === 2 ? (
                <CreditCard className="h-4 w-4 text-[#087650]" />
              ) : (
                <Store className="h-4 w-4 text-[#087650]" />
              )}
              <h2 className="text-sm font-extrabold text-[#171d1e]">
                {STEPS[step]}
              </h2>
            </div>

            {renderStep()}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((current) => current - 1)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cfd8d9] px-5 text-xs font-bold text-[#273133] transition hover:bg-[#f3f7f7]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#073e32] px-6 text-xs font-bold text-white transition hover:bg-[#0b5746] disabled:opacity-60"
              >
                {step === STEPS.length - 1
                  ? isSubmitting
                    ? "Opening Shop…"
                    : "Finish demo setup"
                  : step === 2
                    ? "Save Sandbox details"
                    : "Continue"}
                {step < STEPS.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </form>

          <aside className="seller-benefits-panel rounded-[18px] bg-[#101315] p-5 text-white sm:p-6">
            <h2 className="text-base font-extrabold text-white">
              Why sellers join
            </h2>
            <ul className="mt-4 space-y-3 text-xs text-[#d8e0e0]">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />
                Set up PayPal Orders v2 sandbox checkout
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />
                Add products to the catalog the agent searches
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />
                Review orders and webhook events in one place
              </li>
            </ul>
            {step === STEPS.length - 1 && (
              <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-[#d8e0e0]">
                <CheckCircle2 className="h-4 w-4 text-lime-300" />
                {form.shopName || "Your shop"} is ready for the Shop demo
              </div>
            )}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
