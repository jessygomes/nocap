"use server";
import { db } from "../db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  CreatePartyParams,
  UpdatePartyParams,
  DeletePartyParams,
} from "@/types";

import { getUserById } from "./user.actions";

import { Role } from "@prisma/client";
import path from "path";
import { currentRole } from "../auth";

//! CREATE PARTY
export const createParty = async ({
  party,
  userId,
  path,
}: CreatePartyParams) => {
  try {
    const role = await currentRole();

    if (role !== Role.admin) {
      return new NextResponse(null, { status: 403 });
    }

    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    const adminUser = await getUserById(userId);

    if (!adminUser) {
      return new NextResponse(null, { status: 404 });
    }

    const newParty = await db.party.create({
      data: {
        ...party,
      },
    });

    revalidatePath(path);

    return newParty;
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
};

//! UPDATE PARTY
export async function updateParty({ userId, party, path }: UpdatePartyParams) {
  try {
    const partyToUpdate = await db.party.findUnique({
      where: {
        id: party.partyId,
      },
    });

    if (!partyToUpdate) {
      throw new Error("Party not found");
    }

    const updatedParty = await db.party.update({
      where: { id: party.partyId },
      data: {
        ...party,
      },
    });

    revalidatePath(path);

    return updatedParty;
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

//! DELETE PARTY
export async function deleteParty({ partyId, path }: DeletePartyParams) {
  try {
    const partyToDelete = await db.party.findUnique({
      where: {
        id: partyId,
      },
    });

    if (!partyToDelete) {
      throw new Error("Party not found");
    }

    await db.party.delete({
      where: { id: partyId },
    });

    revalidatePath(path);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

//! GET PARTY BY ID
export async function getPartyById(partyId: string) {
  try {
    const party = await db.party.findUnique({
      where: {
        id: partyId,
      },
      include: {
        photos: true, // Inclure les photos associées à la soirée
      },
    });

    if (!party) {
      return new NextResponse(null, { status: 404 });
    }

    return party;
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

//! GET ALL PARTIES
export async function getAllParties() {
  try {
    const parties = await db.party.findMany();

    return parties;
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}