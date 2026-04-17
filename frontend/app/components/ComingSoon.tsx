import React from "react";

type ComingSoonProps = {
    title: string;
    description: string;
};

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <section className="bg-[#132e2a] rounded-3xl p-6 mt-10 border border-[#1b3f3a] shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-gray-300 text-sm">{description}</p>
        </section>
    );
}
