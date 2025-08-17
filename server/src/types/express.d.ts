import "express";

declare global {
  namespace Express {
    interface Request {
      member?: {
        membershipNumber: string | null;
        memberId: string | null;
        program: string;
      } | null;
    }
  }
}