import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Heart, MessageCircle, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useSocket } from "@/contexts/SocketContext";

function CommentsList({ postId }: { postId: number }) {
  const { data: comments, isLoading } = trpc.posts.comments.useQuery({ postId });

  if (isLoading) return <p className="text-xs text-gray-500">A carregar comentários...</p>;
  if (!comments || comments.length === 0) return null;

  return (
    <div className="space-y-2">
      {comments.map((comment: any) => (
        <div key={comment.id} className="bg-gray-50 p-2 rounded text-sm">
          <p className="font-semibold text-xs">{comment.userName}</p>
          <p>{comment.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { socket } = useSocket();
  const [postText, setPostText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentingOn, setCommentingOn] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<number, any[]>>({});

  // Infinite scroll state
  const { ref: loadMoreRef, inView } = useInView();
  const [offset, setOffset] = useState(0);

  // Fetch posts with pagination
  const { data: postsData, isLoading } = trpc.posts.feed.useQuery({ limit: 20, offset });
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (postsData) {
      setPosts((prev) => [...prev, ...postsData]);
    }
  }, [postsData]);

  const handleLoadMore = () => {
    setOffset((prev) => prev + 20);
  };

  // Load more posts when scrolling
  useEffect(() => {
    if (inView) {
      handleLoadMore();
    }
  }, [inView]);

  // Listen for real-time notifications to refresh feed if needed
  useEffect(() => {
    if (socket) {
      const handleNotification = (data: any) => {
        if (data.type === "like" || data.type === "comment") {
          utils.posts.feed.invalidate();
        }
      };
      socket.on("notification", handleNotification);
      return () => {
        socket.off("notification", handleNotification);
      };
    }
  }, [socket, utils]);

  // Create post mutation
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      setPostText("");
      setSelectedFile(null);
      setIsVideo(false);
      setOffset(0);
      setPosts([]);
      // Invalidate feed query
      utils.posts.feed.invalidate();
    },
  });

  // Upload media mutation
  const uploadMediaMutation = trpc.posts.uploadMedia.useMutation();

  // Like post mutation
  const likePostMutation = trpc.posts.like.useMutation({
    onSuccess: () => {
      utils.posts.feed.invalidate();
    },
  });

  // Add comment mutation
  const addCommentMutation = trpc.posts.addComment.useMutation({
    onSuccess: (_, variables) => {
      setCommentText("");
      // Refresh comments for this post
      utils.posts.comments.invalidate({ postId: variables.postId });
      utils.posts.feed.invalidate();
    },
  });

  // Delete post mutation
  const deletePostMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      setOffset(0);
      setPosts([]);
      utils.posts.feed.invalidate();
    },
  });

  const handleCreatePost = async () => {
    if (!postText.trim()) return;

    let imageUrl: string | undefined;
    let videoUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    // Upload media if selected
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const mediaType = selectedFile.type.startsWith("video") ? "video" : "image";

        const result = await uploadMediaMutation.mutateAsync({
          file: base64.split(",")[1],
          type: mediaType,
          filename: selectedFile.name,
        });

        if (mediaType === "video") {
          videoUrl = result.url;
          // Generate thumbnail (simplified)
          thumbnailUrl = result.url.replace(/\.[^.]+$/, "-thumb.jpg");
        } else {
          imageUrl = result.url;
        }

        // Create post
        await createPostMutation.mutateAsync({
          text: postText,
          image: imageUrl,
          video: videoUrl,
          videoThumbnail: thumbnailUrl,
        });
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // Create post without media
      await createPostMutation.mutateAsync({
        text: postText,
      });
    }
  };

  const flatPosts = posts || [];

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Create Post Card */}
      <Card className="p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <Textarea
              placeholder="O que estás a pensar?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="mb-4"
              rows={3}
            />

            {/* File Preview */}
            {selectedFile && (
              <div className="mb-4 p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFile(null);
                    setIsVideo(false);
                  }}
                >
                  ✕
                </Button>
              </div>
            )}

            {/* Media Upload */}
            <div className="flex gap-2 mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setIsVideo(file.type.startsWith("video"));
                  }
                }}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isVideo ? "Vídeo" : "Imagem"}
              </Button>
            </div>

            {/* Post Button */}
            <Button
              onClick={handleCreatePost}
              disabled={!postText.trim() || createPostMutation.isPending}
              className="w-full"
            >
              {createPostMutation.isPending ? "A publicar..." : "Publicar"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {flatPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Sem posts para mostrar. Procura amigos!</div>
        ) : (
          flatPosts.map((post: any) => (
            <Card key={post.id} className="p-6">
              {/* Post Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {post.userName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{post.userName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                </div>

                {post.userId === user?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePostMutation.mutate({ postId: post.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Post Content */}
              <p className="mb-4 whitespace-pre-wrap">{post.text}</p>

              {/* Media */}
              {post.image && (
                <img src={post.image} alt="Post" className="w-full rounded-lg mb-4 max-h-96 object-cover" />
              )}

              {post.video && (
                <video
                  src={post.video}
                  controls
                  className="w-full rounded-lg mb-4 max-h-96"
                  poster={post.videoThumbnail}
                />
              )}

              {/* Post Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => likePostMutation.mutate({ postId: post.id })}
                  className={post.isLiked ? "text-red-500" : ""}
                >
                  <Heart className={`w-4 h-4 mr-2 ${post.isLiked ? "fill-current" : ""}`} />
                  {post.likes || 0}
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {post.commentCount || 0}
                </Button>
              </div>

              {/* Comments Section */}
              {commentingOn === post.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Escreve um comentário..." 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addCommentMutation.mutate({ postId: post.id, text: commentText });
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      onClick={() => addCommentMutation.mutate({ postId: post.id, text: commentText })}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                    >
                      Postar
                    </Button>
                  </div>
                  
                  {/* Real comments would be fetched here or passed in feed */}
                  <CommentsList postId={post.id} />
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="py-8 text-center">
        {isLoading && <p className="text-gray-500">A carregar mais posts...</p>}
      </div>
    </div>
  );
}
