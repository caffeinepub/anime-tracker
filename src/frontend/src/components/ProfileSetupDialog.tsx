import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

export default function ProfileSetupDialog() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const saveMutation = useSaveCallerUserProfile();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        name,
        email,
        emailPublic: false,
        displaySettings: {
          boxSize: BigInt(1),
          rowSize: BigInt(1),
        },
      });
      toast.success("Profile created!");
    } catch (_error) {
      toast.error("Failed to create profile");
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md bg-black border-4 border-yellow-500 text-white"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-yellow-500 text-xl">
            Welcome to Ani Body Count!
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Let's set up your profile to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Your Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-2 bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300">
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-2 bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
        >
          {saveMutation.isPending ? "Creating Profile..." : "Get Started"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
