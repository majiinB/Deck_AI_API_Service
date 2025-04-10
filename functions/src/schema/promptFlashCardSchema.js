import { SchemaType } from "@google/generative-ai";

export const promptFlashCardSchema = {
    description: "List of definitions with terms or an error message if generation fails",
    type: SchemaType.OBJECT,
    properties: {
        definition_and_terms: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    definition: {
                        type: SchemaType.STRING,
                        description: "The definition of the term",
                        nullable: true, // Now nullable in case AI cannot generate a response
                    },
                    term: {
                        type: SchemaType.STRING,
                        description: "The term that the definition pertains to",
                        nullable: true, // Now nullable in case AI cannot generate a response
                    },
                },
                required: [], // No required fields, as they can be null
            },
        },
        errorMessage: {
            type: SchemaType.STRING,
            description: "Error message if AI cannot generate a response due to inappropriate content or context",
            nullable: true,
        },
    },
    required: ["definition_and_terms"], // Keeping the array required, but it can be empty if errorMessage is present
};
