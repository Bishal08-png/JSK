import { useState } from "react";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  IndianRupee,
  Lock,
  ShieldCheck,
  UserRound,
  Camera,
} from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/useAuth";
import { business } from "../../config/business";

export default function Profile() {
  const { user, login } = useAuth();
  const displayName = user?.name || `${business.initials} Admin`;
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [revenueVisible, setRevenueVisible] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [adminImage, setAdminImage] = useState(user?.image || null);

  const fmt = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

  const revealRevenue = async () => {
    if (revenueVisible) {
      setRevenueVisible(false);
      return;
    }

    if (!stats) {
      setRevenueLoading(true);
      try {
        const { data } = await api.get("/bills/stats");
        setStats(data);
        setRevenueVisible(true);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load revenue");
      } finally {
        setRevenueLoading(false);
      }
      return;
    }
    setRevenueVisible(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setSaving(true);
    try {
      await api.put("/auth/admin/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Admin password updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put("/auth/admin/profile", profileForm);
      login(data); // update auth context & local storage
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files are allowed (JPG, PNG, GIF, WebP)");
      return;
    }

    setSavingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const { data } = await api.post("/auth/admin/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAdminImage(data.image);
      // Update the user context with the new image
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      currentUser.image = data.image;
      localStorage.setItem("user", JSON.stringify(currentUser));
      login(currentUser);

      toast.success("Profile image updated successfully");
      e.target.value = ""; // Reset file input
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload image");
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Admin Profile</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Manage access for {business.name}.
        </p>
      </div>

      <div className="grid grid-2 profile-grid">
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div className="profile-icon">
              <UserRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Account</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Signed-in admin details
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                backgroundColor: "var(--bg-secondary)",
                margin: "0 auto 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "3px solid var(--border-color)",
              }}
            >
              {adminImage ? (
                <img
                  src={adminImage}
                  alt="Admin profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <UserRound size={48} color="var(--text-muted)" />
              )}
            </div>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                marginBottom: 12,
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={savingImage}
                style={{ display: "none" }}
                id="admin-image-input"
              />
              <button
                className="btn btn-secondary"
                onClick={() =>
                  document.getElementById("admin-image-input").click()
                }
                disabled={savingImage}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Camera size={16} />
                {savingImage ? "Uploading..." : "Change Image"}
              </button>
            </div>
          </div>

          <div className="profile-row">
            <span>Name</span>
            <strong>{displayName || "Admin"}</strong>
          </div>
          <div className="profile-row">
            <span>Email</span>
            <strong>{user?.email || "Not available"}</strong>
          </div>
          <div className="profile-row">
            <span>Role</span>
            <strong style={{ textTransform: "capitalize" }}>
              {user?.role || "admin"}
            </strong>
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div className="profile-icon">
              <IndianRupee size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Revenue</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Visible only after admin opens it here
              </p>
            </div>
          </div>

          <div className="revenue-box">
            <div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ color: "var(--accent)" }}>
                {revenueVisible ? fmt(stats?.totalRevenue) : "Hidden"}
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={revealRevenue}
              disabled={revenueLoading}
            >
              {revenueVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              {revenueLoading ? "Loading..." : revenueVisible ? "Hide" : "View"}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20, maxWidth: 620 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div className="profile-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Change Password</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              The current password is required before setting a new one.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="form-control"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-control"
              type="password"
              minLength={6}
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-control"
              type="password"
              minLength={6}
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, confirmPassword: e.target.value })
              }
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Lock size={16} /> {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 20, maxWidth: 620 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div className="profile-icon">
            <UserRound size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>
              Change Name & Email
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Update your admin profile details.
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              type="text"
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, name: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              type="email"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm({ ...profileForm, email: e.target.value })
              }
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingProfile}
          >
            <UserRound size={16} />{" "}
            {savingProfile ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
