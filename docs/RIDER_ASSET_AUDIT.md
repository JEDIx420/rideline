# RIDELINE — Rider Asset Audit: Bike Rider 3D

## 1. Asset Package Location & Overview
- **Package Directory:** `bike-rider-3d/` (Project Root)
- **Source File:** `bike-rider-3d/source/64afc8c0c0cd89901192e499.glb`
- **Asset Size:** 1.54 MB (1,546,612 bytes)
- **Source Generator:** Ready Player Me (GLTF 2.0 Binary)
- **Source URL:** https://sketchfab.com/3d-models/bike-rider-3d-53590579378a4e83a4597b28a9f43149

---

## 2. Geometry & Complexity Metrics
- **Mesh Count:** 7 meshes
- **Total Vertices:** 9,035 vertices
- **Total Triangles:** 14,508 triangles
- **Bounding Box (Meters):**
  - Min: `[-0.532, -0.003, -0.140]`
  - Max: `[+0.532, +1.866, +0.219]`
  - Dimensions: Width = 1.063 m, Height = 1.869 m, Depth = 0.358 m
- **Scale:** 1:1 true real-world metric scale (~1.87m height with helmet and boots).
- **Pivot Point:** Feet center at `[0, 0, 0]`.

### Mesh Breakdown:
| Mesh Index | Node Name | Vertex Count | Triangle Count | Material Assigned | Attributes |
|---|---|---|---|---|---|
| 0 | `EyeLeft` | 120 | 206 | `Wolf3D_Eye` | POSITION, TEXCOORD_0, NORMAL, JOINTS_0, WEIGHTS_0 |
| 1 | `EyeRight` | 120 | 206 | `Wolf3D_Eye` | POSITION, TEXCOORD_0, NORMAL, JOINTS_0, WEIGHTS_0 |
| 2 | `Wolf3D_Head` | 2,162 | 4,094 | `Wolf3D_Skin` | POSITION, TEXCOORD_0, NORMAL, JOINTS_0, WEIGHTS_0 |
| 3 | `Wolf3D_Teeth` | 84 | 100 | `Wolf3D_Teeth` | POSITION, TEXCOORD_0, NORMAL, JOINTS_0, WEIGHTS_0 |
| 4 | `Wolf3D_Outfit_Footwear` | 760 | 1,292 | `Wolf3D_Outfit_Footwear` | POSITION, NORMAL, TANGENT, TEXCOORD_0, JOINTS_0, WEIGHTS_0 |
| 5 | `Wolf3D_Outfit_Top` | 4,555 | 6,980 | `Wolf3D_Outfit_Top` | POSITION, NORMAL, TANGENT, TEXCOORD_0, JOINTS_0, WEIGHTS_0 |
| 6 | `Wolf3D_Headwear` | 1,234 | 1,630 | `Wolf3D_Headwear` | POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0 |

---

## 3. Rigging, Skeleton & Bone Hierarchy
- **Rig Status:** Fully Rigged & Skinned (`JOINTS_0`, `WEIGHTS_0` on all 7 meshes).
- **Root Armature:** `Armature` (Node 71)
- **Total Joint Count:** 67 joints

### Key Bone Mapping:
- **Core Spine & Head:**
  - `Hips` (Node 66) → Root Pelvis
  - `Spine` (Node 55) → Lower Spine
  - `Spine1` (Node 54) → Mid Spine
  - `Spine2` (Node 53) → Upper Chest
  - `Neck` (Node 4) → Neck Joint
  - `Head` (Node 3) → Head Joint & Camera Eye Anchor
- **Left Arm:**
  - `LeftShoulder` (Node 28)
  - `LeftArm` (Node 27) → Upper Arm / Bicep
  - `LeftForeArm` (Node 26) → Elbow to Wrist
  - `LeftHand` (Node 25) → Left Handlebar Clip-on Grip
  - Fingers: `LeftHandThumb1..4`, `LeftHandIndex1..4`, `LeftHandMiddle1..4`, `LeftHandRing1..4`, `LeftHandPinky1..4`
- **Right Arm:**
  - `RightShoulder` (Node 52)
  - `RightArm` (Node 51) → Upper Arm / Bicep
  - `RightForeArm` (Node 50) → Elbow to Wrist
  - `RightHand` (Node 49) → Right Throttle Clip-on Grip
  - Fingers: `RightHandThumb1..4`, `RightHandIndex1..4`, `RightHandMiddle1..4`, `RightHandRing1..4`, `RightHandPinky1..4`
- **Left Leg:**
  - `LeftUpLeg` (Node 60) → Hip to Knee
  - `LeftLeg` (Node 59) → Knee to Ankle
  - `LeftFoot` (Node 58) → Left Rearset Footpeg
  - `LeftToeBase` (Node 57) / `LeftToe_End` (Node 56)
- **Right Leg:**
  - `RightUpLeg` (Node 65) → Hip to Knee
  - `RightLeg` (Node 64) → Knee to Ankle
  - `RightFoot` (Node 63) → Right Rearset Footpeg
  - `RightToeBase` (Node 62) / `RightToe_End` (Node 61)

---

## 4. Materials & Textures
- **Material Workflow:** PBR Metallic-Roughness with embedded binary textures.
- **Embedded Textures (12 images):**
  1. `Wolf3D_Outfit_Top`: Diffuse map (`Outfit_Cupra_Suit_Top_M_D`), Normal map (`Outfit_Cupra_Suit_Top_M_N`), Metallic/Roughness map (`Outfit_Cupra_Suit_Top_M_M`).
  2. `Wolf3D_Outfit_Footwear`: Diffuse map (`Outfit_Cupra_Suit_Footwear_M_D`), Normal map (`Outfit_Cupra_Suit_Footwear_M_N`), Metallic/Roughness map (`Outfit_Cupra_Suit_Footwear_M_M`).
  3. `Wolf3D_Headwear` (Helmet): Diffuse map (`headwear-helmet-03-D`), Normal map (`headwear-helmet-03-N`), Metallic/Roughness map (`headwear-helmet-03-M-headwear-helmet-03-R`).
  4. `Wolf3D_Skin` & `Wolf3D_Eye`: BaseColor maps (`baseColor_1`, `baseColor_2`).
  5. `Wolf3D_Teeth`: Diffuse map (`Wolf3D_Teeth_0`).

---

## 5. Animations & Rest Pose
- **Animations in GLB:** None (0 animation tracks).
- **Initial Pose:** T-Pose / standard bind pose.
- **Procedural Kinematics & IK Plan:**
  - Drive bones (`Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, `LeftArm`, `LeftForeArm`, `RightArm`, `RightForeArm`, `LeftUpLeg`, `LeftLeg`, `RightUpLeg`, `RightLeg`) via analytical kinematic rotations and target IK matching to motorcycle clip-on grips and rearset footpegs.
