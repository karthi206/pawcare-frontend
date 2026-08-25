import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Stethoscope, AlertCircle, Heart, Map, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const features = [
    {
      title: "Disease Detection",
      description: "Upload an image of an animal to instantly detect potential skin diseases using AI.",
      icon: Stethoscope,
      link: "/disease-detection",
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "NGO Locator",
      description: "Find and connect with verified animal welfare organizations near you.",
      icon: Map,
      link: "/ngo-locator",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      title: "Case Tracker",
      description: "Report injured animals and track rescue operations in real-time.",
      icon: AlertCircle,
      link: "/cases",
      color: "bg-red-50 text-red-600"
    },
    {
      title: "Adoption Portal",
      description: "Match with rescued pets ready for their forever home.",
      icon: Heart,
      link: "/adoption",
      color: "bg-amber-50 text-amber-600"
    }
  ];

  return (
    <div className="min-h-full pb-16">
      {/* Hero Section - Fixed Padding & Height to fit Header and Buttons properly */}
      <div className="relative -mt-16 pt-28 pb-12 min-h-[600px] w-full flex items-center overflow-hidden rounded-b-[2.5rem] shadow-xl z-0">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1920&q=80" 
            alt="" 
            aria-hidden="true"
            role="presentation"
            className="w-full h-full object-cover object-[75%_35%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/95 via-[hsl(var(--primary))]/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 lg:px-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl text-white space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              AI-Powered Animal Welfare
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
              AI-Powered <br/>
              <span className="text-accent">Stray Animal Healthcare</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-xl">
              Empowering communities with AI-driven disease detection, emergency rescue tracking, and seamless adoption matching.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link href="/cases">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-primary-foreground font-semibold rounded-xl px-8 h-14 text-base shadow-lg shadow-accent/25 hover:-translate-y-0.5 transition-transform">
                  Report an Animal <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/disease-detection">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold rounded-xl px-8 h-14 text-base backdrop-blur-sm">
                  Try AI Scanner
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Complete Care Ecosystem</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our platform provides end-to-end solutions connecting citizens, veterinarians, and NGOs to save animal lives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div 
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50 hover-elevate group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {feature.description}
              </p>
              <Link href={feature.link} className="inline-flex items-center text-primary font-semibold group-hover:text-accent transition-colors">
                Explore feature <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}