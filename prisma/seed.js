"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
// High quality Unsplash Avatars for Indian Professionals & Students
const AVATARS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
];
const THUMBNAILS = [
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80", // Web Code
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80", // Cyber/Matrix
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80", // DevOps Docker
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80", // Laptop Dev
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80", // AI Brain
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80", // Data Dashboard
    "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&auto=format&fit=crop&q=80", // UI Design Wireframe
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80", // Business Strategy
    "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&auto=format&fit=crop&q=80", // Digital Marketing
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80", // Stock Market / Finance
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80", // Healthcare Hospital
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80", // Medical Science
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", // Team Collaboration / HR
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80", // Public Speaking
    "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80", // Graphic Design
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80", // Video Editing
];
const YOUTUBE_VIDEOS = [
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/bMknfKXIFA8",
    "https://www.youtube.com/embed/SqcY0GlETPk",
    "https://www.youtube.com/embed/kUMe1FH4CHE",
];
const SAMPLE_PDF = "https://www.w3.org/W3C/DesignIssues/diagrams/web-architecture.pdf";
async function main() {
    console.log("🌱 Starting Comprehensive Database Seeding...");
    // ── 0. Clean Existing Database Records ─────────────────────────────
    console.log("🧹 Clearing old database records...");
    await prisma_1.prisma.cartItem.deleteMany();
    await prisma_1.prisma.cart.deleteMany();
    await prisma_1.prisma.coupon.deleteMany();
    await prisma_1.prisma.wishlist.deleteMany();
    await prisma_1.prisma.review.deleteMany();
    await prisma_1.prisma.lessonProgress.deleteMany();
    await prisma_1.prisma.payment.deleteMany();
    await prisma_1.prisma.orderItem.deleteMany();
    await prisma_1.prisma.order.deleteMany();
    await prisma_1.prisma.enrollment.deleteMany();
    await prisma_1.prisma.lesson.deleteMany();
    await prisma_1.prisma.course.deleteMany();
    await prisma_1.prisma.category.deleteMany();
    await prisma_1.prisma.user.deleteMany();
    const hashedAdminPassword = await bcrypt_1.default.hash("admin123", 10);
    const hashedCreatorPassword = await bcrypt_1.default.hash("creator123", 10);
    const hashedStudentPassword = await bcrypt_1.default.hash("student123", 10);
    // ── 1. Create Admin ───────────────────────────────────────────────
    console.log("👤 Creating Admin user...");
    const admin = await prisma_1.prisma.user.create({
        data: {
            name: "Platform Administrator",
            email: "admin@gmail.com",
            password: hashedAdminPassword,
            role: "ADMIN",
            profileImage: AVATARS[0],
            bio: "Lead Platform System Administrator and Operations Director.",
            displayName: "System Admin",
            termsAccepted: true,
        },
    });
    // ── 2. Create 10 Indian Creators ──────────────────────────────────
    console.log("👨‍🏫 Creating 10 Realistic Indian Creator accounts...");
    const creatorData = [
        {
            name: "Aarav Sharma",
            email: "aarav.creator@gmail.com",
            bio: "Senior Full-Stack Architect & Ex-Tech Lead with 12+ years of enterprise software engineering experience.",
            creatorDescription: "Specializing in React 19, Next.js 16, TypeScript, Node.js microservices, and modern web applications.",
            displayName: "Aarav Sharma (Full Stack Lead)",
            website: "https://aaravsharma.dev",
            youtube: "https://youtube.com/@aaravcodes",
            linkedin: "https://linkedin.com/in/aaravsharma",
            profileImage: AVATARS[1],
            expertiseKey: "tech",
        },
        {
            name: "Priya Patel",
            email: "priya.creator@gmail.com",
            bio: "Principal Product Design Consultant & Senior UX Researcher. Formerly Lead Designer at top global SaaS platforms.",
            creatorDescription: "Teaching UX Research, Figma Design Systems, Interactive Prototyping, and Visual Branding.",
            displayName: "Priya Patel (UI/UX Lead)",
            website: "https://priyapatel.design",
            youtube: "https://youtube.com/@priyadesigns",
            linkedin: "https://linkedin.com/in/priyapatel-uiux",
            profileImage: AVATARS[2],
            expertiseKey: "design",
        },
        {
            name: "Rahul Verma",
            email: "rahul.creator@gmail.com",
            bio: "AI Research Specialist & Senior Data Scientist. Published researcher in deep learning and natural language processing.",
            creatorDescription: "Master Artificial Intelligence, Large Language Models, PyTorch, Data Science, and Machine Learning.",
            displayName: "Dr. Rahul Verma (AI Lead)",
            website: "https://rahulverma.ai",
            youtube: "https://youtube.com/@rahulvermaai",
            linkedin: "https://linkedin.com/in/rahulverma-ai",
            profileImage: AVATARS[3],
            expertiseKey: "ai",
        },
        {
            name: "Sneha Kulkarni",
            email: "sneha.creator@gmail.com",
            bio: "Chartered Accountant (CA) & Corporate Financial Analyst with 10+ years advising startups and enterprises.",
            creatorDescription: "Specializing in Stock Market Investing, Corporate Finance, Accounting, and Personal Wealth Management.",
            displayName: "CA Sneha Kulkarni",
            website: "https://snehakulkarni.fin",
            youtube: "https://youtube.com/@snehafinance",
            linkedin: "https://linkedin.com/in/sneha-kulkarni-ca",
            profileImage: AVATARS[4],
            expertiseKey: "finance",
        },
        {
            name: "Aditya Joshi",
            email: "aditya.creator@gmail.com",
            bio: "Chief Marketing Officer & Growth Lead. Managed multi-crore digital ad campaigns and organic growth engines.",
            creatorDescription: "Learn Digital Marketing, Google Ads, SEO Strategy, Social Media Brand Growth, and High-Converting Sales Funnels.",
            displayName: "Aditya Joshi (Growth Lead)",
            website: "https://adityajoshi.marketing",
            youtube: "https://youtube.com/@adityagrowth",
            linkedin: "https://linkedin.com/in/adityajoshi-growth",
            profileImage: AVATARS[5],
            expertiseKey: "marketing",
        },
        {
            name: "Neha Iyer",
            email: "neha.creator@gmail.com",
            bio: "Healthcare Administration Specialist & Senior Hospital Management Consultant with M.HA & Clinical Leadership degree.",
            creatorDescription: "Teaching Hospital Management, Medical Coding, Healthcare Systems Administration, and Clinical Operations.",
            displayName: "Dr. Neha Iyer (M.HA)",
            website: "https://nehaiyer.health",
            youtube: "https://youtube.com/@nehaiyerhealth",
            linkedin: "https://linkedin.com/in/neha-iyer-mha",
            profileImage: AVATARS[6],
            expertiseKey: "healthcare",
        },
        {
            name: "Karan Mehta",
            email: "karan.creator@gmail.com",
            bio: "Management Consultant & Startup Advisor. Alumnus of IIM Ahmedabad with extensive corporate strategy experience.",
            creatorDescription: "Master Business Strategy, Startup Launch Blueprints, Operations Management, and Supply Chain Logistics.",
            displayName: "Karan Mehta (Management Consultant)",
            website: "https://karanmehta.biz",
            youtube: "https://youtube.com/@karanmehtabiz",
            linkedin: "https://linkedin.com/in/karanmehta-iim",
            profileImage: AVATARS[7],
            expertiseKey: "business",
        },
        {
            name: "Ananya Deshmukh",
            email: "ananya.creator@gmail.com",
            bio: "Head of Talent & Corporate HR Strategist. Certified Executive Coach & Workplace Communication Trainer.",
            creatorDescription: "Master Human Resources, Recruitment, Public Speaking, Corporate Communication, and Professional Soft Skills.",
            displayName: "Ananya Deshmukh (HR Director)",
            website: "https://ananyadeshmukh.hr",
            youtube: "https://youtube.com/@ananyahr",
            linkedin: "https://linkedin.com/in/ananyadeshmukh-hr",
            profileImage: AVATARS[8],
            expertiseKey: "hr",
        },
        {
            name: "Rohit Gupta",
            email: "rohit.creator@gmail.com",
            bio: "Principal Cyber Security Analyst & Cloud DevOps Architect. AWS Certified Security Specialist & CISSP.",
            creatorDescription: "Practical Ethical Hacking, Network Security, Kubernetes, Docker, Cloud Security, and CI/CD Automation.",
            displayName: "Rohit Gupta (CISSP & AWS Lead)",
            website: "https://rohitgupta.sec",
            youtube: "https://youtube.com/@rohitguptasec",
            linkedin: "https://linkedin.com/in/rohitgupta-cyber",
            profileImage: AVATARS[9],
            expertiseKey: "security",
        },
        {
            name: "Kavya Nair",
            email: "kavya.creator@gmail.com",
            bio: "Creative Director & Commercial Video Producer. Worked with top Indian D2C brands and media agencies.",
            creatorDescription: "Master Video Editing in Premiere Pro & After Effects, Commercial Photography, and Creative Content Writing.",
            displayName: "Kavya Nair (Creative Director)",
            website: "https://kavyanair.media",
            youtube: "https://youtube.com/@kavyanairmedia",
            linkedin: "https://linkedin.com/in/kavyanair-creative",
            profileImage: AVATARS[10],
            expertiseKey: "media",
        },
    ];
    const creatorsMap = {};
    for (const c of creatorData) {
        const { expertiseKey, ...cleanData } = c;
        const creator = await prisma_1.prisma.user.create({
            data: {
                ...cleanData,
                password: hashedCreatorPassword,
                role: "CREATOR",
                termsAccepted: true,
            },
        });
        creatorsMap[expertiseKey] = creator;
    }
    // ── 3. Create 15 Realistic Indian Students ────────────────────────
    console.log("👨‍🎓 Creating 15 Realistic Indian Student accounts...");
    const studentDataList = [
        { name: "Student User", email: "student@gmail.com" }, // Default test account
        { name: "Akash Patil", email: "akash.patil@gmail.com" },
        { name: "Rohan Kulkarni", email: "rohan.kulkarni@gmail.com" },
        { name: "Anjali Sharma", email: "anjali.sharma@gmail.com" },
        { name: "Pooja Singh", email: "pooja.singh@gmail.com" },
        { name: "Vivek Mishra", email: "vivek.mishra@gmail.com" },
        { name: "Nisha Gupta", email: "nisha.gupta@gmail.com" },
        { name: "Aman Yadav", email: "aman.yadav@gmail.com" },
        { name: "Aditi Joshi", email: "aditi.joshi@gmail.com" },
        { name: "Saurabh Patil", email: "saurabh.patil@gmail.com" },
        { name: "Meera Nair", email: "meera.nair@gmail.com" },
        { name: "Arjun Desai", email: "arjun.desai@gmail.com" },
        { name: "Simran Kaur", email: "simran.kaur@gmail.com" },
        { name: "Harsh Agarwal", email: "harsh.agarwal@gmail.com" },
        { name: "Ritika Jain", email: "ritika.jain@gmail.com" },
        { name: "Yash More", email: "yash.more@gmail.com" },
    ];
    const students = [];
    for (let i = 0; i < studentDataList.length; i++) {
        const s = studentDataList[i];
        const student = await prisma_1.prisma.user.create({
            data: {
                name: s.name,
                email: s.email,
                password: hashedStudentPassword,
                role: "STUDENT",
                profileImage: AVATARS[i % AVATARS.length],
                bio: `Ambitious professional & lifelong learner focusing on skill enhancement and career development.`,
                termsAccepted: true,
            },
        });
        students.push(student);
    }
    // ── 4. Create Expanded Professional Categories ─────────────────────
    console.log("📁 Creating 32 Expanded Professional Categories...");
    const categoriesData = [
        // Business & Management
        { name: "Business", slug: "business", description: "Learn business strategy, operations, corporate planning, and market expansion." },
        { name: "Entrepreneurship", slug: "entrepreneurship", description: "Build, launch, scale, and fund high-growth startups and small businesses." },
        { name: "Project Management", slug: "project-management", description: "Master Agile, Scrum, PMP methodology, and project execution frameworks." },
        { name: "Supply Chain", slug: "supply-chain", description: "Logistics, inventory management, procurement, and global supply chain operations." },
        { name: "Operations Management", slug: "operations-management", description: "Optimize workflow efficiency, process quality control, and business execution." },
        // Marketing & Sales
        { name: "Marketing", slug: "marketing", description: "Comprehensive marketing strategy, brand positioning, and customer acquisition." },
        { name: "Digital Marketing", slug: "digital-marketing", description: "Master SEO, Google Ads, Meta Ads, social media growth, and email marketing." },
        { name: "Sales", slug: "sales", description: "B2B sales strategies, closing techniques, negotiation skills, and pipeline management." },
        // Finance & Stock Market
        { name: "Finance", slug: "finance", description: "Personal finance, corporate financial management, and wealth building strategies." },
        { name: "Accounting", slug: "accounting", description: "Financial accounting fundamentals, balance sheets, taxation, and bookkeeping." },
        { name: "Stock Market", slug: "stock-market", description: "Technical analysis, fundamental investing, options trading, and portfolio strategy." },
        // Healthcare & Medical
        { name: "Healthcare", slug: "healthcare", description: "Overview of modern healthcare delivery systems, medical ethics, and wellness administration." },
        { name: "Nursing", slug: "nursing", description: "Clinical nursing fundamentals, patient care management, and emergency procedures." },
        { name: "Pharmacy", slug: "pharmacy", description: "Pharmacology basics, drug interaction mechanisms, and clinical pharmacy practice." },
        { name: "Medical Coding", slug: "medical-coding", description: "ICD-10, CPT coding standards, medical billing procedures, and healthcare compliance." },
        { name: "Hospital Management", slug: "hospital-management", description: "Hospital operations, health IT infrastructure, and clinical facility administration." },
        // HR & Communication
        { name: "Human Resources", slug: "human-resources", description: "Talent acquisition, HR analytics, performance management, and workplace culture." },
        { name: "Communication Skills", slug: "communication-skills", description: "Effective workplace communication, email writing, and interpersonal dialogue." },
        { name: "Soft Skills", slug: "soft-skills", description: "Time management, emotional intelligence, leadership, and problem-solving skills." },
        { name: "Public Speaking", slug: "public-speaking", description: "Master public presentations, keynote speeches, confidence, and voice modulation." },
        // Creative, Design & Media
        { name: "Graphic Design", slug: "graphic-design", description: "Master Photoshop, Illustrator, visual composition, and digital illustration." },
        { name: "Video Editing", slug: "video-editing", description: "Premiere Pro, After Effects, color grading, motion graphics, and video production." },
        { name: "Photography", slug: "photography", description: "Camera settings, lighting composition, portrait & commercial photo editing." },
        { name: "Content Writing", slug: "content-writing", description: "Copywriting, blog content creation, SEO writing, and brand storytelling." },
        { name: "UI/UX Design", slug: "ui-ux-design", description: "Figma design systems, user research, wireframing, and interactive prototyping." },
        // Technology, AI & Engineering
        { name: "Web Development", slug: "web-development", description: "Build full-stack web applications with React, Next.js, Node.js, and TypeScript." },
        { name: "App Development", slug: "app-development", description: "Develop mobile apps for iOS and Android using React Native and Flutter." },
        { name: "Artificial Intelligence", slug: "artificial-intelligence", description: "Generative AI, Large Language Models, Prompt Engineering, and RAG systems." },
        { name: "Data Science", slug: "data-science", description: "Data analysis, Python, SQL, Pandas, NumPy, and business intelligence." },
        { name: "Machine Learning", slug: "machine-learning", description: "Supervised and unsupervised learning, PyTorch, Deep Learning, and MLOps." },
        { name: "Cyber Security", slug: "cyber-security", description: "Ethical hacking, penetration testing, network defense, and zero-trust security." },
        { name: "Cloud Computing", slug: "cloud-computing", description: "Deploy scalable architecture on AWS, Microsoft Azure, and Google Cloud Platform." },
        { name: "DevOps", slug: "devops", description: "Docker, Kubernetes, Terraform, CI/CD automation, and site reliability engineering." },
    ];
    const categoryMap = {};
    for (const cat of categoriesData) {
        const category = await prisma_1.prisma.category.create({
            data: cat,
        });
        categoryMap[cat.slug] = category;
    }
    // ── 5. Create Realistic Published Courses with Assigned Creators ────
    console.log("📚 Creating Published Courses assigned by expertise...");
    const courseSpecs = [
        // ── Business & Operations (Creator: Karan Mehta)
        {
            title: "Business Strategy Fundamentals",
            catSlug: "business",
            creatorKey: "business",
            price: 2499,
            discountPrice: 1499,
            level: "BEGINNER",
            thumbIdx: 7,
            desc: "Learn core business frameworks, competitive analysis, business model canvas, and strategic planning for modern enterprises.",
        },
        {
            title: "Startup Launch Blueprint",
            catSlug: "entrepreneurship",
            creatorKey: "business",
            price: 3499,
            discountPrice: 2299,
            level: "INTERMEDIATE",
            thumbIdx: 7,
            desc: "Step-by-step guide to validating startup ideas, building MVPs, pitching investors, and scaling early-stage ventures.",
        },
        {
            title: "Business Analytics Essentials",
            catSlug: "business",
            creatorKey: "business",
            price: 2999,
            discountPrice: 1899,
            level: "INTERMEDIATE",
            thumbIdx: 5,
            desc: "Transform raw organizational data into actionable business intelligence using Excel, SQL, and data dashboards.",
        },
        {
            title: "Operations Management & Process Optimization",
            catSlug: "operations-management",
            creatorKey: "business",
            price: 2799,
            discountPrice: 1699,
            level: "INTERMEDIATE",
            thumbIdx: 7,
            desc: "Streamline business operations, implement Lean principles, reduce bottlenecks, and improve workflow productivity.",
        },
        {
            title: "Global Supply Chain & Logistics Masterclass",
            catSlug: "supply-chain",
            creatorKey: "business",
            price: 3299,
            discountPrice: 2099,
            level: "ADVANCED",
            thumbIdx: 7,
            desc: "Master modern supply chain architecture, inventory management systems, procurement, and international logistics.",
        },
        // ── Marketing & Sales (Creator: Aditya Joshi)
        {
            title: "Digital Marketing Masterclass 2026",
            catSlug: "digital-marketing",
            creatorKey: "marketing",
            price: 2999,
            discountPrice: 1799,
            level: "BEGINNER",
            thumbIdx: 8,
            desc: "Complete end-to-end digital marketing guide covering SEO, Google Ads, Meta Ads, content strategy, and analytics.",
        },
        {
            title: "SEO & Google Ads Mastery",
            catSlug: "digital-marketing",
            creatorKey: "marketing",
            price: 2499,
            discountPrice: 1499,
            level: "INTERMEDIATE",
            thumbIdx: 8,
            desc: "Drive organic search traffic and execute high-ROI paid search campaigns on Google Ads with proven keyword techniques.",
        },
        {
            title: "Social Media Marketing & Brand Strategy",
            catSlug: "marketing",
            creatorKey: "marketing",
            price: 1999,
            discountPrice: 1199,
            level: "BEGINNER",
            thumbIdx: 8,
            desc: "Build engaged online communities, design viral social content, and execute targeted campaigns on Instagram, LinkedIn & YouTube.",
        },
        {
            title: "B2B Sales Funnels & Lead Generation",
            catSlug: "sales",
            creatorKey: "marketing",
            price: 3199,
            discountPrice: 1999,
            level: "ADVANCED",
            thumbIdx: 8,
            desc: "Master outbound sales outreach, consultative selling, deal negotiation, and closing high-ticket B2B clients.",
        },
        // ── Finance, Stock Market & Accounting (Creator: Sneha Kulkarni)
        {
            title: "Personal Finance & Wealth Management",
            catSlug: "finance",
            creatorKey: "finance",
            price: 1999,
            discountPrice: 1299,
            level: "BEGINNER",
            thumbIdx: 9,
            desc: "Comprehensive guide to budgeting, tax planning, mutual funds, emergency reserves, and long-term financial independence.",
        },
        {
            title: "Stock Market Investing & Technical Analysis",
            catSlug: "stock-market",
            creatorKey: "finance",
            price: 3999,
            discountPrice: 2499,
            level: "INTERMEDIATE",
            thumbIdx: 9,
            desc: "Learn candlestick patterns, technical indicators, risk management, and fundamental equity research for stock trading.",
        },
        {
            title: "Financial Analysis & Corporate Valuation",
            catSlug: "finance",
            creatorKey: "finance",
            price: 3499,
            discountPrice: 2199,
            level: "ADVANCED",
            thumbIdx: 9,
            desc: "Build financial models in Excel, analyze balance sheets, calculate DCF valuations, and evaluate company performance.",
        },
        {
            title: "Accounting Fundamentals for Business Owners",
            catSlug: "accounting",
            creatorKey: "finance",
            price: 2299,
            discountPrice: 1399,
            level: "BEGINNER",
            thumbIdx: 9,
            desc: "Master double-entry bookkeeping, profit & loss statements, cash flow statements, and GST compliance basics.",
        },
        // ── Healthcare & Medical (Creator: Neha Iyer)
        {
            title: "Introduction to Hospital Management",
            catSlug: "hospital-management",
            creatorKey: "healthcare",
            price: 2799,
            discountPrice: 1699,
            level: "BEGINNER",
            thumbIdx: 10,
            desc: "Explore healthcare facility administration, patient admission workflows, medical quality assurance, and hospital operations.",
        },
        {
            title: "Medical Coding & Billing Basics",
            catSlug: "medical-coding",
            creatorKey: "healthcare",
            price: 2999,
            discountPrice: 1899,
            level: "BEGINNER",
            thumbIdx: 11,
            desc: "Learn ICD-10 diagnostic codes, CPT procedural terminology, insurance claim processing, and medical billing compliance.",
        },
        {
            title: "Healthcare Administration & Patient Care Management",
            catSlug: "healthcare",
            creatorKey: "healthcare",
            price: 3199,
            discountPrice: 1999,
            level: "INTERMEDIATE",
            thumbIdx: 10,
            desc: "Manage healthcare records, clinical protocols, patient satisfaction systems, and regulatory healthcare standards.",
        },
        {
            title: "Fundamentals of Pharmacy & Clinical Practice",
            catSlug: "pharmacy",
            creatorKey: "healthcare",
            price: 2599,
            discountPrice: 1599,
            level: "BEGINNER",
            thumbIdx: 11,
            desc: "Understand pharmacology basics, prescription dosage calculations, drug interactions, and pharmacy inventory control.",
        },
        {
            title: "Essentials of Nursing & Patient Care Fundamentals",
            catSlug: "nursing",
            creatorKey: "healthcare",
            price: 2399,
            discountPrice: 1499,
            level: "BEGINNER",
            thumbIdx: 10,
            desc: "Clinical nursing protocols, vital signs assessment, patient safety procedures, and compassionate care management.",
        },
        // ── HR, Project Management & Communication (Creator: Ananya Deshmukh)
        {
            title: "HR Fundamentals & Talent Acquisition",
            catSlug: "human-resources",
            creatorKey: "hr",
            price: 2499,
            discountPrice: 1499,
            level: "BEGINNER",
            thumbIdx: 12,
            desc: "Master candidate sourcing, structured interviews, employee onboarding, HR analytics, and talent retention strategies.",
        },
        {
            title: "Professional Communication in the Workplace",
            catSlug: "communication-skills",
            creatorKey: "hr",
            price: 1799,
            discountPrice: 999,
            level: "BEGINNER",
            thumbIdx: 13,
            desc: "Enhance business email writing, executive verbal presentation, active listening, and workplace conflict resolution.",
        },
        {
            title: "Public Speaking & Keynote Presentation Masterclass",
            catSlug: "public-speaking",
            creatorKey: "hr",
            price: 2199,
            discountPrice: 1299,
            level: "INTERMEDIATE",
            thumbIdx: 13,
            desc: "Overcome public speaking anxiety, structure persuasive speeches, master body language, and deliver memorable presentations.",
        },
        {
            title: "Project Management Professional (PMP) Prep",
            catSlug: "project-management",
            creatorKey: "hr",
            price: 3999,
            discountPrice: 2699,
            level: "ADVANCED",
            thumbIdx: 12,
            desc: "Comprehensive preparation covering PMBOK guide principles, Agile project management, risk analysis, and PMP exam tactics.",
        },
        {
            title: "Essential Soft Skills for Career Advancement",
            catSlug: "soft-skills",
            creatorKey: "hr",
            price: 1599,
            discountPrice: 899,
            level: "BEGINNER",
            thumbIdx: 13,
            desc: "Develop critical thinking, time management, emotional intelligence, and leadership habits for corporate growth.",
        },
        // ── Creative, Design & Media (Creator: Kavya Nair & Priya Patel)
        {
            title: "Graphic Design Masterclass: Photoshop & Illustrator",
            catSlug: "graphic-design",
            creatorKey: "media",
            price: 2299,
            discountPrice: 1399,
            level: "BEGINNER",
            thumbIdx: 14,
            desc: "Learn professional visual design principles, logo creation, branding collaterals, and digital illustration techniques.",
        },
        {
            title: "Video Editing & Motion Graphics in Premiere Pro",
            catSlug: "video-editing",
            creatorKey: "media",
            price: 2899,
            discountPrice: 1799,
            level: "INTERMEDIATE",
            thumbIdx: 15,
            desc: "Edit cinematic videos, perform color grading, apply audio transitions, and animate motion graphics in After Effects.",
        },
        {
            title: "Digital Photography & Lighting Composition",
            catSlug: "photography",
            creatorKey: "media",
            price: 1999,
            discountPrice: 1199,
            level: "BEGINNER",
            thumbIdx: 15,
            desc: "Master DSLR camera settings, natural & studio lighting, portrait framing, and Lightroom photo editing.",
        },
        {
            title: "Content Writing & Copywriting Mastery",
            catSlug: "content-writing",
            creatorKey: "media",
            price: 1799,
            discountPrice: 999,
            level: "BEGINNER",
            thumbIdx: 14,
            desc: "Write high-converting website copy, engaging blog posts, sales emails, and brand stories that drive conversions.",
        },
        {
            title: "Figma UI/UX Design & Interactive Prototypes",
            catSlug: "ui-ux-design",
            creatorKey: "design",
            price: 2499,
            discountPrice: 1499,
            level: "BEGINNER",
            thumbIdx: 6,
            desc: "Master Figma wireframing, component auto-layout, design systems, micro-interactions, and usability testing.",
        },
        // ── Technology, AI & Engineering (Creators: Aarav Sharma, Rahul Verma, Rohit Gupta)
        {
            title: "Full-Stack Web Development: React 19 & Next.js 16",
            catSlug: "web-development",
            creatorKey: "tech",
            price: 3499,
            discountPrice: 2199,
            level: "INTERMEDIATE",
            thumbIdx: 0,
            desc: "Build high-performance full-stack web applications with React 19, Next.js App Router, TailwindCSS, PostgreSQL, and Prisma.",
        },
        {
            title: "React Native & Expo: iOS & Android Mobile Apps",
            catSlug: "app-development",
            creatorKey: "tech",
            price: 2999,
            discountPrice: 1899,
            level: "INTERMEDIATE",
            thumbIdx: 3,
            desc: "Develop cross-platform mobile apps for iOS and Android using React Native, Expo, navigation libraries, and REST APIs.",
        },
        {
            title: "Artificial Intelligence & LLM Application Development",
            catSlug: "artificial-intelligence",
            creatorKey: "ai",
            price: 4999,
            discountPrice: 3299,
            level: "INTERMEDIATE",
            thumbIdx: 4,
            desc: "Build AI-powered products with OpenAI API, LangChain, vector database indexing (Pinecone/Chroma), and RAG pipelines.",
        },
        {
            title: "Python for Data Science & Advanced Analytics",
            catSlug: "data-science",
            creatorKey: "ai",
            price: 2799,
            discountPrice: 1699,
            level: "BEGINNER",
            thumbIdx: 5,
            desc: "Analyze and visualize complex data sets using Python, Pandas, NumPy, Matplotlib, Seaborn, and Jupyter notebooks.",
        },
        {
            title: "Machine Learning & Deep Learning Bootcamp",
            catSlug: "machine-learning",
            creatorKey: "ai",
            price: 4299,
            discountPrice: 2799,
            level: "INTERMEDIATE",
            thumbIdx: 4,
            desc: "Master regression, classification, clustering algorithms, neural network architectures, and PyTorch frameworks.",
        },
        {
            title: "Practical Cyber Security & Ethical Hacking",
            catSlug: "cyber-security",
            creatorKey: "security",
            price: 3999,
            discountPrice: 2499,
            level: "INTERMEDIATE",
            thumbIdx: 1,
            desc: "Learn penetration testing methodologies, network scanning, vulnerability assessment, web security, and Kali Linux tools.",
        },
        {
            title: "Cloud Computing with AWS & Azure Architecture",
            catSlug: "cloud-computing",
            creatorKey: "security",
            price: 3299,
            discountPrice: 2099,
            level: "INTERMEDIATE",
            thumbIdx: 2,
            desc: "Architect scalable, resilient cloud infrastructure on Amazon Web Services (EC2, S3, RDS) and Microsoft Azure.",
        },
        {
            title: "Docker, Kubernetes & DevOps CI/CD Automation",
            catSlug: "devops",
            creatorKey: "security",
            price: 3699,
            discountPrice: 2399,
            level: "ADVANCED",
            thumbIdx: 2,
            desc: "Containerize applications with Docker, orchestrate microservices on Kubernetes, and automate deployments with GitHub Actions.",
        },
    ];
    const courses = [];
    for (let idx = 0; idx < courseSpecs.length; idx++) {
        const spec = courseSpecs[idx];
        const category = categoryMap[spec.catSlug] || categoryMap["web-development"];
        const creator = creatorsMap[spec.creatorKey] || creatorsMap["tech"];
        const slug = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx + 1}`;
        const numLessons = 6 + (idx % 4); // 6 to 9 lessons
        const course = await prisma_1.prisma.course.create({
            data: {
                title: spec.title,
                slug,
                description: spec.desc,
                price: spec.price,
                discountPrice: spec.discountPrice,
                thumbnailUrl: THUMBNAILS[spec.thumbIdx % THUMBNAILS.length],
                level: spec.level,
                language: "English",
                isPublished: true,
                isFreePreview: true,
                duration: `${numLessons * 45} mins`,
                totalLessons: numLessons,
                creatorId: creator.id,
                categoryId: category.id,
                lessons: {
                    create: Array.from({ length: numLessons }).map((_, lIdx) => ({
                        title: `Lesson ${lIdx + 1}: ${lIdx === 0
                            ? "Course Overview, Setup & Objectives"
                            : lIdx === 1
                                ? "Core Principles & Fundamental Concepts"
                                : lIdx === 2
                                    ? "Hands-on Practical Implementation Part 1"
                                    : lIdx === 3
                                        ? "Hands-on Practical Implementation Part 2"
                                        : lIdx === 4
                                            ? "Advanced Industry Case Study & Best Practices"
                                            : `Real-World Application & Project Review - Part ${lIdx - 4}`}`,
                        description: `Step-by-step practical lesson covering key skills, code/concept breakdowns, and exercise notes for lesson ${lIdx + 1}.`,
                        videoUrl: YOUTUBE_VIDEOS[lIdx % YOUTUBE_VIDEOS.length],
                        pdfUrl: lIdx % 2 === 0 ? SAMPLE_PDF : null,
                        duration: 15 + lIdx * 5,
                        order: lIdx + 1,
                        isPreview: lIdx === 0,
                        isPublished: true,
                    })),
                },
            },
            include: {
                lessons: { orderBy: { order: "asc" } },
            },
        });
        courses.push(course);
    }
    // ── 6. Create Promotional Coupons ───────────────────────────────────
    console.log("🎟️ Creating Promotional Coupons...");
    await prisma_1.prisma.coupon.createMany({
        data: [
            { code: "INDIA2026", description: "Get 50% discount on any course", discount: 50, isPercentage: true, isActive: true },
            { code: "FESTIVE500", description: "Flat ₹500 discount on cart checkout", discount: 500, isPercentage: false, isActive: true },
            { code: "LEARN30", description: "Get 30% discount on all courses", discount: 30, isPercentage: true, isActive: true },
        ],
    });
    // ── 7. Enroll Students, Create Payments (INR), Orders & Lesson Progress ──
    console.log("💳 Enrolling 16 Students into 3-8 courses each & creating Payments in INR...");
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
        const student = students[sIdx];
        const numCoursesToEnroll = 3 + ((sIdx * 2) % 6); // 3 to 8 courses
        const studentCoursePool = [...courses].sort((a, b) => (a.id.charCodeAt(0) + sIdx) - (b.id.charCodeAt(0) + sIdx));
        const enrolledCourses = studentCoursePool.slice(0, numCoursesToEnroll);
        for (let cIdx = 0; cIdx < enrolledCourses.length; cIdx++) {
            const course = enrolledCourses[cIdx];
            const amountPaid = course.discountPrice ?? course.price;
            // Calculate realistic historical date spread across 12 months (0 to 11 months ago)
            const monthOffset = (sIdx * 3 + cIdx * 5) % 12; // 0 to 11 months ago
            const dayOffset = 1 + ((sIdx * 7 + cIdx * 11) % 27); // 1 to 27 day of month
            const now = new Date();
            const recordDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, dayOffset, 10, 30, 0);
            // 1. Create Order
            const order = await prisma_1.prisma.order.create({
                data: {
                    userId: student.id,
                    courseId: course.id,
                    totalAmount: amountPaid,
                    status: "SUCCESS",
                    razorpayOrderId: `order_inr_${sIdx}_${cIdx}_${Date.now()}`,
                    createdAt: recordDate,
                    items: {
                        create: [
                            {
                                courseId: course.id,
                                price: amountPaid,
                            },
                        ],
                    },
                },
            });
            // 2. Create Payment in INR
            await prisma_1.prisma.payment.create({
                data: {
                    orderId: order.id,
                    userId: student.id,
                    courseId: course.id,
                    amount: amountPaid,
                    currency: "INR",
                    status: "SUCCESS",
                    razorpayPaymentId: `pay_inr_${sIdx}_${cIdx}_${Date.now()}`,
                    razorpaySignature: "seed_verified_inr_signature",
                    createdAt: recordDate,
                },
            });
            // 3. Create Enrollment & Lesson Progress
            const lessons = course.lessons;
            const progressPercent = ((sIdx + cIdx) * 25) % 125; // 0, 25, 50, 75, 100
            const lessonsToCompleteCount = Math.floor((progressPercent / 100) * lessons.length);
            let lastLessonId = null;
            for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
                const lesson = lessons[lIdx];
                const isCompleted = lIdx < lessonsToCompleteCount;
                if (isCompleted || lIdx === lessonsToCompleteCount) {
                    lastLessonId = lesson.id;
                }
                if (isCompleted) {
                    await prisma_1.prisma.lessonProgress.create({
                        data: {
                            userId: student.id,
                            lessonId: lesson.id,
                            isCompleted: true,
                        },
                    });
                }
            }
            await prisma_1.prisma.enrollment.create({
                data: {
                    userId: student.id,
                    courseId: course.id,
                    lastLessonId: lastLessonId || (lessons[0] ? lessons[0].id : null),
                    createdAt: recordDate,
                },
            });
            // Increment course totalStudents count
            await prisma_1.prisma.course.update({
                where: { id: course.id },
                data: { totalStudents: { increment: 1 } },
            });
            // 4. Create Review with Realistic Indian Feedback (for ~60% of enrollments)
            if ((sIdx + cIdx) % 2 === 0) {
                const rating = 4 + ((sIdx + cIdx) % 2); // 4 or 5 stars
                const reviewComments = [
                    "Outstanding course! The practical examples and clear explanations made learning so seamless.",
                    "High quality content with excellent depth. The downloadable notes and exercise files are very helpful.",
                    "Superbly structured masterclass! Highly recommended for professionals looking to upgrade their skills.",
                    "Very comprehensive and practical. The instructor covers real-world industry scenarios thoroughly.",
                    "Great value for money. Covered all necessary concepts with great step-by-step guidance.",
                ];
                await prisma_1.prisma.review.create({
                    data: {
                        userId: student.id,
                        courseId: course.id,
                        rating,
                        comment: reviewComments[(sIdx + cIdx) % reviewComments.length],
                        createdAt: recordDate,
                    },
                });
            }
        }
    }
    // ── 8. Recalculate Course Average Ratings ───────────────────────────
    console.log("⭐ Recalculating course average ratings...");
    for (const course of courses) {
        const reviews = await prisma_1.prisma.review.findMany({
            where: { courseId: course.id },
            select: { rating: true },
        });
        if (reviews.length > 0) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            await prisma_1.prisma.course.update({
                where: { id: course.id },
                data: { averageRating: parseFloat(avg.toFixed(1)) },
            });
        }
    }
    // ── 9. Populate Student Wishlists ──────────────────────────────────
    console.log("❤️ Populating Student Wishlists (4-7 courses per student)...");
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
        const student = students[sIdx];
        const enrolled = await prisma_1.prisma.enrollment.findMany({
            where: { userId: student.id },
            select: { courseId: true },
        });
        const enrolledIds = new Set(enrolled.map((e) => e.courseId));
        const eligibleCourses = courses.filter((c) => !enrolledIds.has(c.id));
        const wishlistPool = eligibleCourses.slice(0, 4 + (sIdx % 4));
        for (const c of wishlistPool) {
            await prisma_1.prisma.wishlist.create({
                data: {
                    userId: student.id,
                    courseId: c.id,
                },
            });
        }
    }
    // ── 10. Populate Student Carts ─────────────────────────────────────
    console.log("🛒 Populating Student Carts (1-3 courses per student)...");
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
        const student = students[sIdx];
        const enrolled = await prisma_1.prisma.enrollment.findMany({
            where: { userId: student.id },
            select: { courseId: true },
        });
        const enrolledIds = new Set(enrolled.map((e) => e.courseId));
        const wishlisted = await prisma_1.prisma.wishlist.findMany({
            where: { userId: student.id },
            select: { courseId: true },
        });
        const wishlistIds = new Set(wishlisted.map((w) => w.courseId));
        const cartEligible = courses.filter((c) => !enrolledIds.has(c.id) && !wishlistIds.has(c.id));
        const cartItems = cartEligible.slice(0, 1 + (sIdx % 3));
        if (cartItems.length > 0) {
            const cart = await prisma_1.prisma.cart.create({
                data: {
                    userId: student.id,
                },
            });
            for (const item of cartItems) {
                await prisma_1.prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        courseId: item.id,
                    },
                });
            }
        }
    }
    // ── 11. Print Execution Summary Output ─────────────────────────────
    const counts = {
        users: await prisma_1.prisma.user.count(),
        admin: await prisma_1.prisma.user.count({ where: { role: "ADMIN" } }),
        creators: await prisma_1.prisma.user.count({ where: { role: "CREATOR" } }),
        students: await prisma_1.prisma.user.count({ where: { role: "STUDENT" } }),
        categories: await prisma_1.prisma.category.count(),
        courses: await prisma_1.prisma.course.count(),
        lessons: await prisma_1.prisma.lesson.count(),
        enrollments: await prisma_1.prisma.enrollment.count(),
        orders: await prisma_1.prisma.order.count(),
        payments: await prisma_1.prisma.payment.count(),
        reviews: await prisma_1.prisma.review.count(),
        wishlists: await prisma_1.prisma.wishlist.count(),
        carts: await prisma_1.prisma.cart.count(),
        cartItems: await prisma_1.prisma.cartItem.count(),
    };
    console.log("\n=========================================================");
    console.log("🚀 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=========================================================");
    console.log(`📊 Summary of generated records:`);
    console.log(` - Admin Users      : ${counts.admin}`);
    console.log(` - Indian Creators  : ${counts.creators}`);
    console.log(` - Indian Students  : ${counts.students}`);
    console.log(` - Total Users      : ${counts.users}`);
    console.log(` - Categories       : ${counts.categories}`);
    console.log(` - Published Courses: ${counts.courses}`);
    console.log(` - Lessons          : ${counts.lessons}`);
    console.log(` - Enrollments      : ${counts.enrollments}`);
    console.log(` - Orders           : ${counts.orders}`);
    console.log(` - Payments (INR)   : ${counts.payments}`);
    console.log(` - Reviews (3-5⭐)  : ${counts.reviews}`);
    console.log(` - Wishlist Items   : ${counts.wishlists}`);
    console.log(` - Active Carts     : ${counts.carts}`);
    console.log(` - Cart Items       : ${counts.cartItems}`);
    console.log("\n=========================================================");
    console.log("🔐 DEMO & TEST ACCOUNT CREDENTIALS");
    console.log("=========================================================");
    console.log("\n👑 ADMIN ACCOUNT:");
    console.log(`  - Email   : admin@gmail.com`);
    console.log(`  - Password: admin123`);
    console.log("\n👨‍🏫 INDIAN CREATOR ACCOUNTS (Default Password: creator123):");
    for (const c of creatorData) {
        console.log(`  - ${c.name.padEnd(18)}: ${c.email}`);
    }
    console.log("\n👨‍🎓 INDIAN STUDENT ACCOUNTS (Default Password: student123):");
    console.log(`  - Student User      : student@gmail.com`);
    for (let i = 1; i < studentDataList.length; i++) {
        const s = studentDataList[i];
        console.log(`  - ${s.name.padEnd(18)}: ${s.email}`);
    }
    console.log("=========================================================\n");
}
main()
    .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
