import Link from "next/link";
import { ArrowRight, Search, MessageSquare, Repeat, Gamepad2, Camera, Guitar, Cpu, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Search,
    title: "List what you have",
    description: "Add photos, a description, and what you'd like in return. Takes minutes.",
  },
  {
    icon: Repeat,
    title: "Get matched automatically",
    description: "Our matching engine finds direct swaps — and multi-person swap chains you'd never find alone.",
  },
  {
    icon: MessageSquare,
    title: "Chat & complete the swap",
    description: "Negotiate details in-app, then trade locally or ship it safely.",
  },
];

const categories = [
  { icon: Gamepad2, label: "Gaming" },
  { icon: Blocks, label: "LEGO" },
  { icon: Camera, label: "Camera Gear" },
  { icon: Guitar, label: "Instruments" },
  { icon: Cpu, label: "PC Components" },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="container flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="rounded-full bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
          No buying. No selling. Just swapping.
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Turn what you don&apos;t want into what you do.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          SwapApp matches you with people who have what you want — even if it takes a chain of
          trades to get there.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/discover">
            <Button size="lg" variant="outline">
              Browse listings
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold sm:text-3xl">How swapping works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title}>
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold sm:text-3xl">
          Starting with communities that already swap
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {categories.map((category) => (
            <div
              key={category.label}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
            >
              <category.icon className="h-4 w-4 text-primary" />
              {category.label}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">Ready to swap your first item?</h2>
            <p className="max-w-md text-primary-foreground/80">
              Join the community and let SwapApp find your next trade.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Create your free account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
