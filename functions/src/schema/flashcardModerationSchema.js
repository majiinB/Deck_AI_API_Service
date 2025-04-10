import { SchemaType } from "@google/generative-ai";

export const moderatedFlashcardsSchema = {
    description: "Schema for AI moderation results of flashcards, List the flagged card in the flagged_cards array or leave empty if all is appropriate",
    type: SchemaType.OBJECT,
    properties: {
        is_appropriate: {
            type: SchemaType.BOOLEAN,
            description: "Indicates if all content is appropriate (true) or if any flagged content exists (false).",
            nullable: false
        },
        moderation_decision: {
            type: SchemaType.STRING,
            description: "Summary of the moderation decision, e.g., 'All content is appropriate' or 'Some content was flagged for review'.",
            nullable: false
        },
        flagged_cards: {
            type: SchemaType.ARRAY,
            description: "List of flagged flashcards containing inappropriate content.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    description: {
                        type: SchemaType.STRING,
                        description: "The flagged definition or description.",
                        nullable: false
                    },
                    term: {
                        type: SchemaType.STRING,
                        description: "The flagged term associated with the description.",
                        nullable: false
                    },
                    reason: {
                        type: SchemaType.STRING,
                        description: "Reason why the content was flagged",
                        nullable: false
                    }
                },
                required: ["description", "term"]
            }
        }
    },
    required: ["is_appropriate", "moderation_decision", "flagged_cards"]
};
