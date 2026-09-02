// The core job card — port of src/components/JobCard.tsx (deliver flow trimmed
// to review-only; Zoho verification is out of scope in the mock build).
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { JOB_STATUS, JOB_TYPE, STATUS_FLOW } from "../../lib/constants";
import { getPickupReminderUrl, getReviewLinkUrl, getWhatsAppUrl } from "../../lib/whatsapp";
import { formatDayMonth, formatINR, formatTime, timeSince } from "../../lib/format";
import { useData } from "../../store/data";
import type { Job } from "../../mock/types";
import PressScale from "../PressScale";
import JobPhotos from "./JobPhotos";
import JobNotes from "./JobNotes";
import DueBadge from "./DueBadge";

export default function JobCard({
  job,
  onStatusChange,
  showActions = true,
  largePhotos = false,
  onAddParts,
  hideDeliverFlow = false,
  showUndo = false,
  readyBikeCount = 0,
}: {
  job: Job;
  onStatusChange?: (jobId: string, newStatus: string) => void;
  showActions?: boolean;
  largePhotos?: boolean;
  onAddParts?: (jobId: string, currentAmount: number | null) => void;
  hideDeliverFlow?: boolean;
  showUndo?: boolean;
  readyBikeCount?: number;
}) {
  const statusConfig = JOB_STATUS[job.status as keyof typeof JOB_STATUS];
  const typeConfig = JOB_TYPE[job.jobType as keyof typeof JOB_TYPE];
  const nextStatuses = STATUS_FLOW[job.status] || [];

  return (
    <View
      className={`rounded-lg p-4 mb-3 shadow-sm ${statusConfig?.bgLight || "bg-white"}`}
      style={{ borderLeftWidth: 4, borderLeftColor: statusConfig?.hex || "#9ca3af" }}
    >
      {/* Top row: token + status */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">{typeConfig?.emoji || "🔧"}</Text>
          <Text className="font-bold text-lg text-gray-900">
            {job.tokenNumber}
            {job.priority > 0 && <Text className="text-red-500"> 🔴</Text>}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${statusConfig?.color || "bg-gray-400"}`}>
          <Text className="text-sm font-semibold text-white">
            {statusConfig?.emoji} {statusConfig?.label}
          </Text>
        </View>
      </View>

      {/* Bike photos */}
      {job.photos.length > 0 && <JobPhotos jobId={job.id} photos={job.photos} large={largePhotos} />}

      {/* Bike + Customer */}
      <View className="mb-2">
        <Text className="text-lg font-semibold text-gray-900">🚲 {job.bikeType}</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-600">👤 {job.customer.name}</Text>
          {job.customer.phone && job.customer.phone !== "0000000000" && (
            <PressScale
              onPress={() => Linking.openURL(`tel:+91${job.customer.phone}`)}
              className="flex-row items-center bg-green-50 border border-green-200 px-3 py-1.5 rounded-full"
            >
              <Text className="text-green-700 font-bold text-xs">📞 Call</Text>
            </PressScale>
          )}
        </View>
        {job.complaint && <Text className="text-gray-500 text-sm mt-1">💬 {job.complaint}</Text>}

        {job.partsNeeded ? (
          <View className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
            <Text className="text-xs font-bold text-orange-700 mb-1">🔧 Parts & Services</Text>
            {job.partsNeeded.split(", ").map((item, i) => (
              <Text key={i} className="text-sm text-orange-800 py-0.5">• {item}</Text>
            ))}
          </View>
        ) : job.amount != null && job.amount > 0 && job.status !== "DELIVERED" ? (
          <View className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 flex-row items-center justify-between">
            <Text className="text-xs font-bold text-red-600">⚠️ No breakdown added</Text>
            <Text className="text-xs text-red-500">Use "Add Parts" to update</Text>
          </View>
        ) : null}

        {job.holdReason && job.status === "PARTS_NEEDED" && (
          <Text className="text-red-600 text-sm mt-1 font-medium">📌 Hold: {job.holdReason}</Text>
        )}
      </View>

      {/* Promised delivery / pickup status */}
      <DueBadge job={job} />

      {/* Amount — prominent display */}
      {job.amount != null && (
        <View className="bg-green-50 rounded-lg px-3 py-2 mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-green-700">💰 Payable</Text>
          <Text className="text-lg font-black text-green-800">{formatINR(job.amount)}</Text>
        </View>
      )}

      {/* Bottom row: mechanic + time */}
      <View className="flex-row items-center justify-between">
        {job.mechanic ? (
          <View className="bg-gray-100 px-2 py-1 rounded-full">
            <Text className="text-sm text-gray-600">{job.mechanic.emoji} {job.mechanic.name}</Text>
          </View>
        ) : (
          <View className="bg-red-50 px-2 py-1 rounded-full">
            <Text className="text-sm text-red-500">❓ Unassigned</Text>
          </View>
        )}
        <View className="items-end">
          <Text className="text-gray-400 text-xs">{timeSince(job.receivedAt)}</Text>
          <Text className="text-gray-400 text-[10px]">
            {formatDayMonth(job.receivedAt)} {formatTime(job.receivedAt)}
          </Text>
        </View>
      </View>

      {/* Bill number — shown when billing has entered it */}
      {job.zohoInvoiceId && job.status === "READY" && (
        <View className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-bold text-green-600">🧾 Zoho Bill</Text>
            <Text className="text-green-800 font-bold text-base">{job.zohoInvoiceId}</Text>
          </View>
          <View className="bg-green-100 px-2 py-1 rounded-full">
            <Text className="text-green-600 text-xs font-bold">BILLED</Text>
          </View>
        </View>
      )}

      {/* After-service photos */}
      {job.afterPhotos.length > 0 && (
        <View className="mt-2">
          <Text className="text-xs font-bold text-purple-700 mb-1">📸 After Service Photos</Text>
          <JobPhotos jobId={job.id} photos={job.afterPhotos} large={largePhotos} photoType="after" />
        </View>
      )}

      {/* Upload after-service photo — mocked: appends a placeholder */}
      {showActions && ["RSVC", "SND", "ECYC"].includes(job.jobType) && job.status !== "DELIVERED" && (
        <AfterPhotoUpload jobId={job.id} afterCount={job.afterPhotos.length} />
      )}

      {/* Action buttons — for non-DELIVERED transitions */}
      {showActions && nextStatuses.length > 0 && onStatusChange && (
        <View className="flex-row gap-2 mt-3">
          {nextStatuses
            .filter((s) => s !== "DELIVERED") // DELIVERED handled by review flow below
            .filter((s) => s !== "RECEIVED" || (showUndo && job.status === "READY")) // Undo only for managers
            .map((next) => {
              const nextConfig = JOB_STATUS[next as keyof typeof JOB_STATUS];
              return (
                <PressScale
                  key={next}
                  onPress={() => onStatusChange(job.id, next)}
                  className={`flex-1 ${nextConfig?.color} py-3 rounded-lg items-center min-h-[56px] justify-center`}
                >
                  <Text className="text-white font-bold text-lg">
                    {nextConfig?.emoji} {nextConfig?.label}
                  </Text>
                </PressScale>
              );
            })}
        </View>
      )}

      {/* Add Parts button for active jobs — including READY for walk-in spares */}
      {showActions && onAddParts && job.status !== "DELIVERED" && (
        <PressScale
          onPress={() => onAddParts(job.id, job.amount)}
          className="w-full mt-2 bg-orange-50 py-2.5 rounded-lg border border-orange-200 items-center"
        >
          <Text className="text-orange-700 font-bold text-sm">🔩 Add Parts / Update Bill</Text>
        </PressScale>
      )}

      {/* Staff notes for active jobs */}
      {showActions && !hideDeliverFlow && job.status !== "DELIVERED" && (
        <JobNotes jobId={job.id} notes={job.notes || ""} />
      )}

      {/* Show saved notes read-only for mechanics */}
      {job.notes && hideDeliverFlow ? (
        <View className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
          <Text className="text-xs font-bold text-yellow-700 mb-0.5">📝 Notes</Text>
          <Text className="text-sm text-yellow-800">{job.notes}</Text>
        </View>
      ) : null}

      {/* Pickup reminder for READY jobs sitting 3+ days */}
      {job.status === "READY" && !hideDeliverFlow && (() => {
        const readyTime = job.promisedAt ? new Date(job.promisedAt).getTime() : new Date(job.receivedAt).getTime();
        const daysSince = Math.floor((Date.now() - readyTime) / 86400000);
        if (daysSince < 3 || job.customer.phone === "0000000000") return null;
        return (
          <PressScale
            onPress={() => {
              const url = getPickupReminderUrl(job.customer.phone, job.customer.name, job.tokenNumber, daysSince, readyBikeCount || 40);
              if (url) Linking.openURL(url);
            }}
            className="w-full mt-2 bg-red-500 py-2.5 rounded-lg items-center"
          >
            <Text className="text-white font-bold text-sm">📢 Send Pickup Reminder ({daysSince} days waiting)</Text>
          </PressScale>
        );
      })()}

      {/* Review + Deliver flow for READY jobs — hidden for mechanics */}
      {job.status === "READY" && showActions && !hideDeliverFlow && <ReviewAndDeliver job={job} />}

      {/* Mechanic sees a message instead */}
      {job.status === "READY" && hideDeliverFlow && (
        <View className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 items-center">
          <Text className="text-sm font-medium text-green-700">✅ Marked Ready — staff will handle delivery</Text>
        </View>
      )}

      {/* Review link for delivered jobs */}
      {job.status === "DELIVERED" && !hideDeliverFlow && (
        <PressScale
          onPress={() => {
            const url = getReviewLinkUrl(job.customer.phone, job.customer.name, job.tokenNumber);
            if (url) Linking.openURL(url);
          }}
          className="w-full mt-3 bg-green-100 py-2.5 rounded-lg items-center"
        >
          <Text className="text-green-700 font-bold text-sm">📱 Send Review Link via WhatsApp</Text>
        </PressScale>
      )}
    </View>
  );
}

// Mock after-photo "upload" — appends a placeholder asset (photo capture is out of scope)
function AfterPhotoUpload({ jobId, afterCount }: { jobId: string; afterCount: number }) {
  const addAfterPhoto = useData((s) => s.addAfterPhoto);
  const [uploading, setUploading] = useState(false);

  if (afterCount >= 7) return null;

  const handle = async () => {
    setUploading(true);
    await addAfterPhoto(jobId).catch(() => {});
    setUploading(false);
  };

  return (
    <View className="flex-row gap-2 mt-2">
      <PressScale
        onPress={handle}
        disabled={uploading}
        className={`flex-1 bg-purple-50 py-2 rounded-lg border border-purple-200 items-center ${uploading ? "opacity-50" : ""}`}
      >
        <Text className="text-purple-700 font-bold text-sm">{uploading ? "⏳ Uploading..." : "📸 After Photo"}</Text>
      </PressScale>
      <PressScale
        onPress={handle}
        disabled={uploading}
        className={`flex-1 bg-purple-50 py-2 rounded-lg border border-purple-200 items-center ${uploading ? "opacity-50" : ""}`}
      >
        <Text className="text-purple-700 font-bold text-sm">🖼️ Gallery</Text>
      </PressScale>
    </View>
  );
}

// Deliver flow (trimmed): Ready to Deliver → star rating + Google-review check → delivered
function ReviewAndDeliver({ job }: { job: Job }) {
  const updateJobStatus = useData((s) => s.updateJobStatus);
  const saveReview = useData((s) => s.saveReview);
  const [step, setStep] = useState<"ask" | "review" | "delivered">(job.jobType === "QFX" ? "review" : "ask");
  const [rating, setRating] = useState(0); // 0 = not yet rated — avoids auto-5★ placeholder reviews
  const [googleReview, setGoogleReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isWalkIn = job.customer.phone === "0000000000";

  const submitReviewAndDeliver = async () => {
    setSubmitting(true);
    await saveReview(job.tokenNumber, rating, googleReview).catch(() => {});
    await updateJobStatus({ jobId: job.id, newStatus: "DELIVERED" });
    setSubmitting(false);
    setStep("delivered");
  };

  const sendDeliveryWhatsApp = () => {
    const waUrl = getWhatsAppUrl(job.customer.phone, "DELIVERED", job.customer.name, job.tokenNumber);
    if (waUrl) Linking.openURL(waUrl);
  };

  if (step === "ask") {
    return (
      <PressScale
        onPress={() => setStep("review")}
        className="w-full mt-3 bg-green-500 py-3 rounded-lg items-center min-h-[56px] justify-center"
      >
        <Text className="text-white font-bold text-lg">✅ Ready to Deliver</Text>
      </PressScale>
    );
  }

  if (step === "delivered") {
    return (
      <View className="mt-3">
        <View className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 items-center">
          <Text className="text-3xl mb-1">🏁</Text>
          <Text className="font-bold text-green-800">Delivered!</Text>
        </View>
        {!isWalkIn && (
          <PressScale onPress={sendDeliveryWhatsApp} className="w-full bg-green-100 py-3 rounded-lg mb-2 items-center">
            <Text className="text-green-700 font-bold text-base">📱 Send WhatsApp confirmation</Text>
          </PressScale>
        )}
      </View>
    );
  }

  // Review step — star rating + Google-review confirmation
  return (
    <View className="mt-3">
      <View className="flex-row justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
            <Text className="text-3xl">{star <= rating ? "⭐" : "☆"}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setGoogleReview(!googleReview)}
        className="flex-row items-center gap-3 bg-white rounded-lg p-3 border border-gray-200 mb-3"
      >
        <View className={`w-5 h-5 rounded items-center justify-center ${googleReview ? "bg-green-600" : "border border-gray-300 bg-white"}`}>
          {googleReview && <Text className="text-white text-xs font-bold">✓</Text>}
        </View>
        <Text className="font-semibold text-gray-800 text-sm">Customer gave Google Review</Text>
      </Pressable>

      {rating === 0 && (
        <Text className="text-center text-xs text-gray-400 mb-2">Tap a star to rate before delivering</Text>
      )}
      <PressScale
        onPress={submitReviewAndDeliver}
        disabled={submitting || rating === 0}
        className={`w-full py-3 rounded-lg items-center ${submitting || rating === 0 ? "bg-gray-300" : "bg-green-500"}`}
      >
        <Text className="text-white font-bold text-base">{submitting ? "Saving..." : "✅ Mark Delivered"}</Text>
      </PressScale>

      {job.jobType !== "QFX" && (
        <Pressable onPress={() => setStep("ask")} className="w-full mt-2 py-2 items-center">
          <Text className="text-gray-400 text-sm font-medium">Back</Text>
        </Pressable>
      )}
    </View>
  );
}
