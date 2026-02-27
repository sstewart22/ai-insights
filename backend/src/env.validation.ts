import Joi from "joi";

export const envSchema = Joi.object({
  OPENAI_API_KEY: Joi.string().required(),

  DATABASE_HOST: Joi.string().default("127.0.0.1"),
  DATABASE_PORT: Joi.number().default(1433),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().default("ai_assist"),
});
