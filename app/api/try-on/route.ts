import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
    try {
        const { userImage, productImage, category, description } = await req.json();

        if (!process.env.REPLICATE_API_TOKEN) {
            console.error("Error: REPLICATE_API_TOKEN is missing. Did you restart the server?");
            return NextResponse.json(
                { error: "Server Configuration Error: Restart Required (API Key missing)" },
                { status: 500 }
            );
        }

        if (!userImage || !productImage) {
            return NextResponse.json(
                { error: "Missing userImage or productImage" },
                { status: 400 }
            );
        }

        console.log("Starting Replicate Generation...");
        console.log("- User Image Length:", userImage.length);
        console.log("- Product URL:", productImage);

        // OOTDiffusion Deployment on Replicate
        // Model: viktorfa/oot_diffusion
        const output = await replicate.run(
            "viktorfa/oot_diffusion:c890e02d8180bde7eeed1a138217ee154d8cdd8769a29f02bd51fea33d268385",
            {
                input: {
                    model_image: userImage,
                    garment_image: productImage,
                    steps: 20,
                    guidance_scale: 2,
                    seed: 0,
                },
            }
        );

        return NextResponse.json({ output });
    } catch (error: any) {
        console.error("Try-On Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate try-on image" },
            { status: 500 }
        );
    }
}
