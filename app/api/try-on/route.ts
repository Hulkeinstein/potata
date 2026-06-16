import { NextResponse } from "next/server";
import Replicate from "replicate";
import { auth } from "@/auth";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// 허용 입력: data:image/* 또는 https URL만. base64 폭주 방지 상한(~10MB).
const MAX_IMAGE_LENGTH = 10 * 1024 * 1024;
function isAllowedImage(value: unknown): value is string {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= MAX_IMAGE_LENGTH &&
        (value.startsWith("data:image/") || value.startsWith("https://"))
    );
}

export async function POST(req: Request) {
    try {
        // 인증 게이트: 미인증자는 유료 Replicate 호출에 도달하지 못한다.
        // 다른 어떤 체크(서버 설정 등)보다 먼저 둬서 미인증자에게 내부 상태를 노출하지 않는다.
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!process.env.REPLICATE_API_TOKEN) {
            console.error("Error: REPLICATE_API_TOKEN is missing. Did you restart the server?");
            return NextResponse.json(
                { error: "Server Configuration Error: Restart Required (API Key missing)" },
                { status: 500 }
            );
        }

        const body = (await req.json()) as {
            userImage?: string;
            productImage?: string;
        };
        const { userImage, productImage } = body;

        if (!userImage || !productImage) {
            return NextResponse.json(
                { error: "Missing userImage or productImage" },
                { status: 400 }
            );
        }

        if (!isAllowedImage(userImage) || !isAllowedImage(productImage)) {
            return NextResponse.json(
                { error: "Invalid image input (must be data:image/* or https URL within size limit)" },
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
    } catch (error: unknown) {
        console.error("Try-On Error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate try-on image",
            },
            { status: 500 }
        );
    }
}
